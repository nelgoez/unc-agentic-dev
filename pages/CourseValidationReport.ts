import type { CourseStructure, SectionData } from './StudentCoursePage'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

export interface AuditFinding {
  severity: 'critical' | 'warning' | 'info'
  sectionNumber: number
  sectionTitle: string
  message: string
  detail: string
}

export class CourseValidationReport {
  private outputDir: string

  constructor(outputDir: string = 'reports/audit') {
    this.outputDir = outputDir
    mkdirSync(resolve(this.outputDir), { recursive: true })
  }

  findPhantoms(student: CourseStructure): AuditFinding[] {
    const findings: AuditFinding[] = []
    const seenKeys = new Set<string>()

    function addFinding(f: AuditFinding): void {
      const key = `${f.sectionNumber}|${f.message}`
      if (!seenKeys.has(key)) {
        seenKeys.add(key)
        findings.push(f)
      }
    }

    // Identify which sections are locked and in what order
    const lockedSections = student.sections.filter((s) => s.isLocked)
    const firstLocked = lockedSections[0] || null

    for (const studentSection of student.sections) {
      const cleanRestriction = this.cleanRestrictionText(studentSection.restrictionText)
      const hasRestriction = studentSection.isLocked && cleanRestriction.length > 0

      // Check 1: Restriction references an activity that doesn't exist
      if (hasRestriction) {
        const requiredMatches = this.extractRequiredActivities(cleanRestriction)
        const isFirstLocked = studentSection === firstLocked

        for (const required of requiredMatches) {
          const normalizedRequired = required.toLowerCase()

          // Look for the activity in all sections (accessible or not)
          const matchingActivity = student.sections
            .flatMap((s) => s.activities)
            .find(
              (a) =>
                a.name.toLowerCase().includes(normalizedRequired) ||
                normalizedRequired.includes(a.name.toLowerCase()),
            )

          if (!matchingActivity) {
            if (isFirstLocked) {
              // Root cause: first locked section references an activity that truly doesn't exist
              addFinding({
                severity: 'critical',
                sectionNumber: studentSection.number,
                sectionTitle: studentSection.title,
                message: `Actividad requerida "${required}" no encontrada en el curso`,
                detail: [
                  `El módulo "${studentSection.title}" está bloqueado y requiere la actividad "${required}" para desbloquearse.`,
                  `No existe ninguna actividad con ese nombre en todo el curso.`,
                  `Causa probable: la condición de finalización se configuró sobre un recurso (PDF, video, notebook) que no es una actividad de Moodle, o la actividad fue eliminada pero la condición persiste.`,
                ].join(' '),
              })
            } else {
              // Cascading: this locked section references activities that might be in an earlier locked section
              addFinding({
                severity: 'info',
                sectionNumber: studentSection.number,
                sectionTitle: studentSection.title,
                message: `Actividad "${required}" referenciada pero no visible — probablemente en módulo bloqueado`,
                detail: `El módulo "${studentSection.title}" requiere "${required}" para desbloquearse, pero esa actividad no es visible para el estudiante. Probablemente está en "${firstLocked?.title || 'un módulo anterior'}" que está bloqueado. Al resolver la causa raíz, esto debería resolverse automáticamente.`,
              })
            }
          } else if (!matchingActivity.hasCompletionTracking && matchingActivity.isVisible) {
            addFinding({
              severity: 'warning',
              sectionNumber: studentSection.number,
              sectionTitle: studentSection.title,
              message: `Actividad "${required}" visible sin seguimiento de finalización`,
              detail: `La actividad "${required}" es visible pero no tiene casilla de seguimiento de finalización. Si el curso requiere marcarla como completa para avanzar, el estudiante no podrá progresar.`,
            })
          }
        }
      }

      // Check 2: Section locked even though student completed everything visible
      if (studentSection.isLocked) {
        const visibleWithTracking = studentSection.activities.filter(
          (a) => a.isVisible && a.hasCompletionTracking,
        )
        const allComplete =
          visibleWithTracking.length > 0 && visibleWithTracking.every((a) => a.isComplete)

        if (allComplete && studentSection !== firstLocked) {
          addFinding({
            severity: 'warning',
            sectionNumber: studentSection.number,
            sectionTitle: studentSection.title,
            message: `Módulo bloqueado con actividades completas — probable cascada`,
            detail: `El módulo "${studentSection.title}" está bloqueado a pesar de que las actividades visibles están completas. Es consecuencia del bloqueo del módulo anterior.`,
          })
        }
      }

      // Check 3: Sidebar/biblioteca resources that might be phantoms
      if (!studentSection.isLocked) {
        const summaryRefs = this.extractActivityReferencesFromSummary(studentSection)
        const activityNames = new Set(studentSection.activities.map((a) => a.name.toLowerCase()))
        for (const ref of summaryRefs) {
          const exists = [...activityNames].some(
            (name) => name.includes(ref.toLowerCase()) || ref.toLowerCase().includes(name),
          )
          if (!exists) {
            addFinding({
              severity: 'info',
              sectionNumber: studentSection.number,
              sectionTitle: studentSection.title,
              message: `Recurso "${ref}" mencionado en el texto del módulo sin actividad asociada`,
              detail: `El texto menciona "${ref}" pero no se encuentra como una actividad de Moodle. Si este recurso debe tener seguimiento de finalización, falta configurarlo.`,
            })
          }
        }
      }
    }

    // Summary: if there's a root cause phantom and cascading locks, add a summary finding
    const rootPhantoms = findings.filter(
      (f) => f.severity === 'critical' && f.message.includes('no encontrada en ningún módulo'),
    )
    const cascadingWarnings = findings.filter(
      (f) => f.severity === 'warning' && f.message.includes('cascada'),
    )
    if (rootPhantoms.length > 0 && cascadingWarnings.length > 0) {
      addFinding({
        severity: 'info',
        sectionNumber: -1,
        sectionTitle: 'Resumen',
        message: `${rootPhantoms.length} actividad(es) fantasma(s) como causa raíz. ${cascadingWarnings.length} módulo(s) bloqueado(s) en cascada.`,
        detail: `Se detectaron actividades fantasma que bloquean la progresión del curso. Los demás hallazgos de tipo "cascada" son consecuencias directas. Al corregir la causa raíz (agregar o corregir las actividades faltantes), los bloqueos en cascada se resuelven automáticamente.`,
      })
    }

    return findings
  }

  private cleanRestrictionText(text: string): string {
    return text
      .replace(/Show\s+more\s*Show\s+less/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  private extractRequiredActivities(restrictionText: string): string[] {
    const seen = new Set<string>()
    const matches: string[] = []
    const regex = /the activity[\x20\t]+([^\n,]+?)[\x20\t]+is marked complete/gi
    const allMatches = restrictionText.matchAll(regex)
    for (const m of allMatches) {
      const name = m[1].trim()
      if (!seen.has(name)) {
        seen.add(name)
        matches.push(name)
      }
    }
    return matches
  }

  private extractActivityReferencesFromSummary(section: SectionData): string[] {
    const refs: string[] = []
    // Keywords that indicate referenced resources
    const keywords = ['notebook', 'pdf', 'guía', 'recurso', 'actividad', 'video', 'lambda']
    // Check activity names
    for (const act of section.activities) {
      for (const kw of keywords) {
        if (act.name.toLowerCase().includes(kw) && !refs.includes(act.name)) {
          refs.push(act.name)
        }
      }
    }
    return refs
  }

  generateHtmlReport(
    courseId: string,
    studentView: CourseStructure,
    findings: AuditFinding[],
    screenshotPaths: Record<number, string>,
  ): string {
    const criticalCount = findings.filter((f) => f.severity === 'critical').length
    const warningCount = findings.filter((f) => f.severity === 'warning').length
    const infoCount = findings.filter((f) => f.severity === 'info').length
    const totalIssues = findings.length
    const statusColor = criticalCount > 0 ? '#dc2626' : warningCount > 0 ? '#f59e0b' : '#16a34a'
    const statusText = criticalCount > 0 ? 'CRÍTICO' : warningCount > 0 ? 'ADVERTENCIA' : 'APROBADO'

    const sectionCards = studentView.sections
      .map((section) => {
        const sectionFindings = findings.filter((f) => f.sectionNumber === section.number)
        const sectionCritical = sectionFindings.filter((f) => f.severity === 'critical').length
        const sectionColor =
          sectionCritical > 0 ? '#dc2626' : sectionFindings.length > 0 ? '#f59e0b' : '#16a34a'
        const screenshotPath = screenshotPaths[section.number] || ''

        const findingHtml = sectionFindings
          .map(
            (f) => `
        <div class="finding finding-${f.severity}">
          <div class="finding-icon">${f.severity === 'critical' ? '🔴' : f.severity === 'warning' ? '🟡' : 'ℹ️'}</div>
          <div class="finding-content">
            <div class="finding-title">${f.message}</div>
            <div class="finding-detail">${f.detail}</div>
          </div>
        </div>
      `,
          )
          .join('\n')

        const activityRows = section.activities
          .map((a) => {
            const statusIcon = a.isComplete ? '✅' : a.hasCompletionTracking ? '⬜' : '—'
            const visibilityIcon = a.isVisible ? '👁️' : '🚫'
            return `<tr>
          <td>${visibilityIcon}</td>
          <td>${a.name}</td>
          <td>${a.type}</td>
          <td>${statusIcon}</td>
        </tr>`
          })
          .join('\n')

        const lockStatus = section.isLocked
          ? `<span class="badge badge-locked">🔒 Bloqueado</span>`
          : `<span class="badge badge-unlocked">🔓 Accesible</span>`

        return `
      <div class="section-card" style="border-left: 4px solid ${sectionColor};">
        <div class="section-header">
          <h2>${section.title || `Sección ${section.number}`}</h2>
          ${lockStatus}
        </div>
        ${section.restrictionText ? `<div class="restriction-info">${section.restrictionText}</div>` : ''}
        <table class="activity-table">
          <thead>
            <tr><th>Vis</th><th>Actividad</th><th>Tipo</th><th>Completado</th></tr>
          </thead>
          <tbody>${activityRows || '<tr><td colspan="4">Sin actividades registradas</td></tr>'}</tbody>
        </table>
        ${findingHtml}
        ${screenshotPath ? `<img src="${screenshotPath}" alt="Screenshot Sección ${section.number}" class="section-screenshot" />` : ''}
      </div>`
      })
      .join('\n')

    const findingsList = findings
      .map(
        (f) => `
      <div class="finding finding-${f.severity}">
        <div class="finding-icon">${f.severity === 'critical' ? '🔴' : f.severity === 'warning' ? '🟡' : 'ℹ️'}</div>
        <div class="finding-content">
          <div class="finding-title">${f.message}</div>
          <div class="finding-meta">${f.sectionTitle}</div>
        </div>
      </div>
    `,
      )
      .join('\n')

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Auditoría de Curso — ${studentView.courseName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f1f5f9; color: #1e293b; padding: 24px; }
    .container { max-width: 960px; margin: 0 auto; }
    .header { background: white; border-radius: 12px; padding: 32px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header h1 { font-size: 1.5em; margin-bottom: 8px; color: #0f172a; }
    .header .subtitle { color: #64748b; font-size: 0.9em; margin-bottom: 16px; }
    .status-badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-weight: 600; font-size: 0.85em; color: white; background: ${statusColor}; margin-bottom: 16px; }
    .stats-row { display: flex; gap: 16px; margin: 16px 0; }
    .stat-card { background: #f8fafc; border-radius: 8px; padding: 16px; flex: 1; text-align: center; }
    .stat-card .stat-number { font-size: 1.8em; font-weight: 700; }
    .stat-card .stat-label { font-size: 0.8em; color: #64748b; margin-top: 4px; }
    .stat-critical .stat-number { color: #dc2626; }
    .stat-warning .stat-number { color: #f59e0b; }
    .stat-info .stat-number { color: #3b82f6; }
    .section-card { background: white; border-radius: 12px; padding: 24px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .section-header h2 { font-size: 1.15em; }
    .badge { padding: 4px 12px; border-radius: 12px; font-size: 0.8em; font-weight: 500; }
    .badge-locked { background: #fef2f2; color: #dc2626; }
    .badge-unlocked { background: #f0fdf4; color: #16a34a; }
    .restriction-info { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px; margin-bottom: 16px; font-size: 0.85em; color: #92400e; }
    .activity-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 0.9em; }
    .activity-table th { text-align: left; padding: 8px 12px; background: #f8fafc; border-bottom: 2px solid #e2e8f0; font-weight: 600; color: #475569; }
    .activity-table td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; }
    .finding { display: flex; gap: 12px; padding: 12px; border-radius: 8px; margin-bottom: 8px; font-size: 0.9em; }
    .finding-critical { background: #fef2f2; border: 1px solid #fecaca; }
    .finding-warning { background: #fffbeb; border: 1px solid #fde68a; }
    .finding-info { background: #eff6ff; border: 1px solid #bfdbfe; }
    .finding-icon { font-size: 1.2em; flex-shrink: 0; }
    .finding-title { font-weight: 600; margin-bottom: 4px; }
    .finding-detail { color: #475569; font-size: 0.9em; line-height: 1.4; }
    .finding-meta { color: #64748b; font-size: 0.8em; }
    .section-screenshot { width: 100%; border-radius: 8px; border: 1px solid #e2e8f0; margin-top: 12px; }
    .findings-summary { background: white; border-radius: 12px; padding: 24px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .findings-summary h2 { font-size: 1.15em; margin-bottom: 16px; }
    .footer { text-align: center; color: #94a3b8; font-size: 0.8em; margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="status-badge">${statusText}</div>
      <h1>${studentView.courseName}</h1>
      <div class="subtitle">
        <p>Curso ID: ${courseId}</p>
        <p>URL: <a href="${studentView.courseUrl}">${studentView.courseUrl}</a></p>
        <p>Fecha del análisis: ${new Date().toLocaleString('es-AR')}</p>
        <p>Rol usado: Estudiante (admin no disponible)</p>
      </div>
      <div class="stats-row">
        <div class="stat-card stat-critical">
          <div class="stat-number">${criticalCount}</div>
          <div class="stat-label">Críticos</div>
        </div>
        <div class="stat-card stat-warning">
          <div class="stat-number">${warningCount}</div>
          <div class="stat-label">Advertencias</div>
        </div>
        <div class="stat-card stat-info">
          <div class="stat-number">${infoCount}</div>
          <div class="stat-label">Informativos</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${studentView.sections.length}</div>
          <div class="stat-label">Secciones</div>
        </div>
      </div>
    </div>

    ${
      findings.length > 0
        ? `
    <div class="findings-summary">
      <h2>Hallazgos (${totalIssues})</h2>
      ${findingsList}
    </div>`
        : ''
    }

    <h2 style="margin-bottom: 16px;">Detalle por Módulo</h2>
    ${sectionCards}
    <div class="footer">
      Generado por UNC Campus Virtual — Herramienta de Validación de Cursos v1.0<br />
      Playwright + TypeScript • ${new Date().toISOString()}
    </div>
  </div>
</body>
</html>`

    return html
  }

  saveReport(courseId: string, html: string): string {
    const filename = resolve(this.outputDir, `audit-course-${courseId}.html`)
    writeFileSync(filename, html, 'utf-8')
    console.warn(`Report saved: ${filename}`)
    return filename
  }
}
