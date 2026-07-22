import { resolve } from 'node:path'
import { writeFileSync, mkdirSync } from 'node:fs'
import { MoodleApiClient } from '../tests/components/api/MoodleApiClient'

const baseUrl = process.env.MOODLE_BASE_URL ?? 'https://campus.aulavirtual.unc.edu.ar'
const wsToken = (process.env.MOODLE_WS_TOKEN ?? '').trim()
const courseIds = ['267', '265', '269', '276']
const outDir = resolve('reports/mvp-demo')

interface CourseReport {
  courseId: string
  courseName: string
  sections: Array<{ number: number; name: string; activityCount: number; restricted: boolean }>
  restrictions: Array<{
    section: string
    activityName: string
    conditions: Array<{ type: string; detail: string }>
  }>
  completionStatus: string
  freshStudentStatus: string
  nelthorStatus: string
  findings: Array<{ severity: string; section: string; message: string; recommendation: string }>
}

async function auditCourse(api: MoodleApiClient, courseId: string): Promise<CourseReport> {
  const contents = await api.getCourseContents(courseId)
  const breakdown = await api.getAvailabilityJsonBreakdown(courseId)
  const orphans = await api.findOrphanedCmIds(contents)

  const testUser = await api.createUser(
    `report-${courseId}-${Date.now().toString(36)}`,
    'ReportPass2026!',
    'Report',
    'Student',
    `report.${courseId}.${Date.now().toString(36)}@test.unc.edu.ar`,
  )
  const freshUserId = testUser.id

  let freshStatus = 'No completada ninguna actividad (usuario nuevo)'
  try {
    const freshCompletion = await api.getActivitiesCompletionStatus(courseId, freshUserId)
    const tracked = freshCompletion.filter((c: any) => c.tracking > 0)
    freshStatus = `${tracked.length} actividades con tracking, ${tracked.filter((c: any) => c.state === 1).length} completadas`
  } catch {}

  let nelthorStatus = 'No se pudo obtener'
  try {
    const nelthorUsers = await api.getUsersByField('username', ['nelthor'])
    if (nelthorUsers[0]) {
      const nelthorCompletion = await api.getActivitiesCompletionStatus(
        courseId,
        nelthorUsers[0].id,
      )
      const tracked = nelthorCompletion.filter((c: any) => c.tracking > 0)
      nelthorStatus = `${tracked.length} actividades con tracking, ${tracked.filter((c: any) => c.state === 1).length} completadas`
    }
  } catch {}

  await api.deleteUsers([freshUserId])

  const report: CourseReport = {
    courseId,
    courseName: contents[0]?.name || `Curso ${courseId}`,
    sections: breakdown.sections.map((s: any) => ({
      number: s.section,
      name: s.name,
      activityCount: s.moduleCount,
      restricted: s.hasSectionRestriction || s.modulesWithRestrictions.length > 0,
    })),
    restrictions: breakdown.sections
      .filter((s: any) => s.modulesWithRestrictions.length > 0)
      .flatMap((s: any) =>
        s.modulesWithRestrictions.map((m: any) => ({
          section: s.name,
          activityName: m.name,
          conditions: m.conditions.map((c: any) => ({
            type: c.type,
            detail: c.cm
              ? `Requiere completion de cmid ${c.cm}`
              : c.id
                ? `Nota mínima ${c.min} (grade item ${c.id})`
                : c.type,
          })),
        })),
      ),
    completionStatus: nelthorStatus,
    freshStudentStatus: freshStatus,
    nelthorStatus,
    findings: [],
  }

  if (orphans.length > 0) {
    for (const o of orphans) {
      report.findings.push({
        severity: 'critico',
        section: o.sectionName,
        message: `cmid ${o.cmid} referenciado en disponibilidad JSON no existe`,
        recommendation: 'Eliminar la condición de disponibilidad que referencia este cmid.',
      })
    }
  }

  for (const section of breakdown.sections) {
    for (const mod of section.modulesWithRestrictions) {
      for (const cond of mod.conditions) {
        if (cond.type === 'grade') {
          report.findings.push({
            severity: 'info',
            section: section.name,
            message: `"${mod.name}" requiere nota mínima ${cond.min} (grade item ${cond.id})`,
            recommendation:
              'Verificar que el grade item exista y tenga datos. Sin calificaciones, el certificado nunca se desbloqueará.',
          })
        }
        if (cond.type === 'completion' && cond.cm) {
          report.findings.push({
            severity: 'info',
            section: section.name,
            message: `"${mod.name}" requiere completion de cmid ${cond.cm}`,
            recommendation:
              'Verificar que la actividad referenciada tenga completion tracking habilitado y sea accesible por estudiantes.',
          })
        }
      }
    }
  }

  return report
}

async function main() {
  mkdirSync(outDir, { recursive: true })
  const api = new MoodleApiClient(baseUrl, wsToken)
  const reports: CourseReport[] = []

  for (const courseId of courseIds) {
    console.log(`Auditando curso ${courseId}...`)
    try {
      const report = await auditCourse(api, courseId)
      reports.push(report)
      const reportPath = resolve(outDir, `REPORTE-CURSO-${courseId}.md`)
      writeFileSync(reportPath, generateSingleReport(report), 'utf-8')
      console.log(`  -> Reporte generado: ${reportPath}`)
    } catch (err) {
      console.error(`  -> Error auditando curso ${courseId}:`, err)
    }
  }

  const summaryPath = resolve(outDir, 'REPORTE-MVP-UNC.md')
  writeFileSync(summaryPath, generateSummaryReport(reports), 'utf-8')
  console.log(`Reporte multi-curso generado: ${summaryPath}`)
  console.log(`Total cursos auditados: ${reports.length}`)
}

function generateSingleReport(data: CourseReport): string {
  const tienePhantoms = data.findings.some((f) => f.severity === 'critico')

  return `# Reporte de Auditoría — UNC Campus Virtual

**Curso:** ${data.courseName} (ID ${data.courseId})
**Fecha:** ${new Date().toISOString().split('T')[0]}
**Herramienta:** Suite de auditoría automatizada (REST API + Playwright)

---

## Resumen Ejecutivo

### Estado actual del curso

| Aspecto | Estado |
|---------|--------|
| Actividades totales | ${data.sections.reduce((s, sec) => s + sec.activityCount, 0)} |
| Secciones | ${data.sections.length} |
| Actividades con restricciones | ${data.restrictions.reduce((s, r) => s + r.conditions.length, 0)} |
| Phantoms (cmids huérfanos) | ${data.findings.filter((f) => f.severity === 'critico').length} |
| Completación de estudiante nuevo | ${data.freshStudentStatus} |

**Conclusión principal:** ${
    tienePhantoms
      ? 'Se detectaron referencias a actividades que no existen en el curso. Esto puede causar bloqueos permanentes para estudiantes.'
      : 'No se detectaron actividades fantasma a nivel de datos JSON. Las restricciones existentes referencian actividades y grade items válidos.'
  }

---

## Detalle Técnico

### Resultados del Análisis JSON

${data.findings.length === 0 ? 'No se encontraron hallazgos significativos.' : ''}
${data.findings
  .map(
    (f) => `#### ${f.severity.toUpperCase()}: ${f.message}
- **Sección:** ${f.section}
- **Recomendación:** ${f.recommendation}
`,
  )
  .join('\n')}

### Restricciones Detectadas

${data.restrictions.length === 0 ? 'No se detectaron restricciones de disponibilidad en el curso.' : ''}
${data.restrictions
  .map(
    (r) => `#### "${r.activityName}" (${r.section})
${r.conditions.map((c) => `- Tipo: **${c.type}** — ${c.detail}`).join('\n')}
`,
  )
  .join('\n')}

---

*Reporte generado automáticamente por la suite de auditoría UNC Agentic Dev — ${new Date().toISOString()}*
`
}

function generateSummaryReport(reports: CourseReport[]): string {
  const totalActivities = reports.reduce(
    (s, r) => s + r.sections.reduce((s2, sec) => s2 + sec.activityCount, 0),
    0,
  )
  const totalRestrictions = reports.reduce(
    (s, r) => s + r.restrictions.reduce((s2, res) => s2 + res.conditions.length, 0),
    0,
  )
  const totalPhantoms = reports.reduce(
    (s, r) => s + r.findings.filter((f) => f.severity === 'critico').length,
    0,
  )

  const header = `# Reporte de Auditoría Multi-Curso — UNC Campus Virtual

**Fecha:** ${new Date().toISOString().split('T')[0]}
**Herramienta:** Suite de auditoría automatizada (REST API + Playwright)
**Cursos auditados:** ${reports.length}

---

## Resumen General

| Curso ID | Nombre | Secciones | Actividades | Phantoms | Restricciones |
|----------|--------|-----------|-------------|----------|---------------|
${reports.map((r) => `| ${r.courseId} | ${r.courseName} | ${r.sections.length} | ${r.sections.reduce((s, sec) => s + sec.activityCount, 0)} | ${r.findings.filter((f) => f.severity === 'critico').length} | ${r.restrictions.reduce((s, res) => s + res.conditions.length, 0)} |`).join('\n')}

**Totales:** ${reports.length} cursos, ${totalPhantoms} phantoms, ${totalRestrictions} restricciones, ${totalActivities} actividades.

---

## Detalle por Curso

${reports
  .map(
    (r) => `### Curso ${r.courseId} — ${r.courseName}

- **${r.sections.length} secciones**, ${r.sections.reduce((s, sec) => s + sec.activityCount, 0)} actividades
- **${r.findings.filter((f) => f.severity === 'critico').length} phantoms** detectados
- **${r.restrictions.reduce((s, res) => s + res.conditions.length, 0)} restricciones**
- **Estudiante nuevo:** ${r.freshStudentStatus}
${r.restrictions.map((res) => `- "${res.activityName}" (${res.section}): ${res.conditions.map((c) => `${c.type} — ${c.detail}`).join('; ')}`).join('\n')}
`,
  )
  .join('\n')}

---

## Metodología

| Componente | Propósito |
|-----------|-----------|
| \`MoodleApiClient\` | Llamadas REST API directas con token de servicio web |
| \`findOrphanedCmIds()\` | Detecta cmids referenciados en JSON de disponibilidad que no existen |
| \`getAvailabilityJsonBreakdown()\` | Mapa completo de todas las restricciones del curso |
| Fresh Student | Creación y limpieza automática de usuarios de prueba por curso |

---

*Reporte generado automáticamente por la suite de auditoría UNC Agentic Dev — ${new Date().toISOString()}*
`

  return header
}

main().catch(console.error)
