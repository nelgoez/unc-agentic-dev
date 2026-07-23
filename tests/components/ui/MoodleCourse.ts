import type { Page } from '@playwright/test'
import { atc } from '../../utils/decorators'

export interface ActivityData {
  name: string
  type: string
  href: string
  isVisible: boolean
  hasCompletionTracking: boolean
  isComplete: boolean
  availabilityInfo: string
}

export interface SectionData {
  number: number
  title: string
  isLocked: boolean
  restrictionText: string
  activities: ActivityData[]
  allVisibleComplete: boolean
}

export interface TabLink {
  title: string
  sectionNumber: number
  isDisabled: boolean
  restrictionText: string
}

export interface CourseStructure {
  courseName: string
  courseUrl: string
  tabs: TabLink[]
  sections: SectionData[]
}

export interface AuditFinding {
  severity: 'critical' | 'warning' | 'info'
  sectionNumber: number
  sectionTitle: string
  message: string
  detail: string
  actionItem?: string
  priority?: 'high' | 'medium' | 'low'
}

export interface ActivityCompletionSummary {
  activityName: string
  sectionName: string
  totalStudents: number
  completedCount: number
  completionRate: number
}

export class MoodleCourse {
  private page: Page
  private baseUrl: string

  constructor(page: Page, baseUrl: string) {
    this.page = page
    this.baseUrl = baseUrl
  }

  @atc('MC-1', { story: 'UNC-RE-1', feature: 'Course Scan' })
  async goToCourse(courseId: string): Promise<void> {
    await this.page.goto(`${this.baseUrl}/course/view.php?id=${courseId}`)
    await this.page.waitForLoadState('load')
    await this.page
      .locator('.course-content, .nav-tabs, a.nav-link[href*="section="]')
      .first()
      .waitFor({ state: 'visible', timeout: 15000 })
      .catch(() => {})
  }

  @atc('MC-2', { story: 'UNC-RE-1', feature: 'Course Scan' })
  async getTabs(): Promise<TabLink[]> {
    return this.page.evaluate(() => {
      const tabLinks = document.querySelectorAll<HTMLAnchorElement>('a.nav-link[href*="section="]')
      const seen = new Map<
        number,
        { title: string; isDisabled: boolean; restrictionText: string }
      >()

      Array.from(tabLinks).forEach((a) => {
        const href = a.getAttribute('href') || ''
        const sectionMatch = href.match(/section=(\d+)/)
        const sectionNumber = sectionMatch ? Number.parseInt(sectionMatch[1], 10) : -1
        if (sectionNumber < 0) return

        const parentLi = a.closest('li')
        const isDisabled =
          parentLi?.classList.contains('disabled') || a.classList.contains('disabled')
        const rawTitle = a.textContent?.trim() || ''
        const cleanTitle =
          rawTitle
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean)[0] || rawTitle
        const restrictionEl = parentLi?.querySelector(
          '.availabilityinfo, .dimmed_text, .text-muted',
        )
        let restrictionText = restrictionEl?.textContent?.trim() || ''
        if (!restrictionText) {
          const infoEl = parentLi?.querySelector('[id^="format_onetopic_winfo_tab-"]')
          if (infoEl) restrictionText = infoEl.textContent?.trim() || ''
        }
        restrictionText = restrictionText
          .replace(/Show\s+more\s*Show\s+less/gi, '')
          .replace(/\s+/g, ' ')
          .trim()

        if (
          !seen.has(sectionNumber) ||
          (cleanTitle && cleanTitle.length > 2 && !seen.get(sectionNumber)!.title)
        ) {
          seen.set(sectionNumber, { title: cleanTitle, isDisabled, restrictionText })
        }
      })

      return Array.from(seen.entries())
        .sort(([a], [b]) => a - b)
        .map(([sectionNumber, data]) => ({
          title: data.title || `Sección ${sectionNumber}`,
          sectionNumber,
          isDisabled: data.isDisabled,
          restrictionText: data.restrictionText,
        }))
    })
  }

  @atc('MC-3', { story: 'UNC-RE-1', feature: 'Course Scan' })
  async navigateToSection(sectionNumber: number): Promise<void> {
    const url = this.page.url()
    const match = url.match(/id=(\d+)/)
    const courseId = match ? match[1] : ''
    await this.page.goto(`${this.baseUrl}/course/view.php?id=${courseId}&section=${sectionNumber}`)
    await this.page.waitForLoadState('load')
    await this.page
      .locator(`#section-${sectionNumber}`)
      .waitFor({ state: 'attached', timeout: 10000 })
      .catch(() => {})
  }

  @atc('MC-4', { story: 'UNC-RE-1', feature: 'Course Scan' })
  async getSectionActivities(sectionNumber: number): Promise<ActivityData[]> {
    return this.page.evaluate((secNum) => {
      const section = document.querySelector(`#section-${secNum}, li#section-${secNum}`)
      if (!section) return []

      const activities = section.querySelectorAll('.activity')
      return Array.from(activities).map((act) => {
        const nameEl = act.querySelector('[data-activityname]')
        const linkEl = act.querySelector('a')
        const completionEl = act.querySelector('.activity-completion')
        const isDimmed = act.classList.contains('dimmed')
        const modType =
          Array.from(act.classList)
            .find((c) => c.startsWith('modtype_'))
            ?.replace('modtype_', '') || 'unknown'
        const hasCheckbox = !!completionEl?.querySelector('input[type="checkbox"]')
        const checkboxChecked =
          hasCheckbox && !!completionEl?.querySelector('input[type="checkbox"]:checked')
        const autoComplete = completionEl?.classList.contains('completion-automatic')
        const name =
          nameEl?.getAttribute('data-activityname') ||
          linkEl?.textContent?.trim() ||
          act.textContent?.trim().substring(0, 60) ||
          'UNNAMED'

        // Admin-only: availability info below restricted activities
        const availEl = act.querySelector('.availabilityinfo')
        const availabilityInfo = availEl
          ? (availEl.textContent || '')
              .replace(/Show\s+more\s*Show\s+less/gi, '')
              .replace(/\s+/g, ' ')
              .trim()
          : ''

        return {
          name,
          type: modType,
          href: linkEl?.getAttribute('href') || '',
          isVisible: !isDimmed,
          hasCompletionTracking: hasCheckbox || !!autoComplete,
          isComplete: checkboxChecked || false,
          availabilityInfo,
        }
      })
    }, sectionNumber)
  }

  @atc('MC-5', { story: 'UNC-RE-1', feature: 'Course Scan' })
  async getCourseName(): Promise<string> {
    return this.page.title()
  }

  @atc('MC-6', { story: 'UNC-RE-1', feature: 'Course Scan' })
  async takeScreenshot(filename: string): Promise<void> {
    await this.page
      .locator('.course-content, #region-main')
      .first()
      .scrollIntoViewIfNeeded()
      .catch(() => {})
    await this.page.screenshot({ path: filename, fullPage: false })
  }

  @atc('MC-7', { story: 'UNC-RE-1', feature: 'Course Scan' })
  async analyze(courseId: string): Promise<CourseStructure> {
    await this.goToCourse(courseId)
    const courseName = await this.page.title()
    const courseUrl = this.page.url()
    const tabs = await this.getTabs()

    const sections: SectionData[] = []
    for (const tab of tabs) {
      await this.navigateToSection(tab.sectionNumber)
      const title = await this.page.evaluate(
        () => document.querySelector('.sectionname')?.textContent?.trim() || '',
      )
      const activities = await this.getSectionActivities(tab.sectionNumber)
      const restrictionText =
        tab.restrictionText ||
        (await this.page.evaluate((secNum) => {
          const section = document.querySelector(`#section-${secNum}, li#section-${secNum}`)
          if (!section) return ''
          const avail = section.querySelector(
            '.section_availability .availabilityinfo, .availabilityinfo',
          )
          return avail?.textContent?.trim() || ''
        }, tab.sectionNumber))

      const visibleWithTracking = activities.filter((a) => a.isVisible && a.hasCompletionTracking)
      const allVisibleComplete =
        visibleWithTracking.length > 0 && visibleWithTracking.every((a) => a.isComplete)

      sections.push({
        number: tab.sectionNumber,
        title: title || tab.title,
        isLocked: tab.isDisabled,
        restrictionText,
        activities,
        allVisibleComplete,
      })
    }

    return { courseName, courseUrl, tabs, sections }
  }

  findPhantoms(
    admin: CourseStructure,
    student?: CourseStructure,
    apiModuleData?: Map<string, { completion: number; isautomatic: boolean }>,
    nelthorData?: Map<string, { state: number }>,
  ): AuditFinding[] {
    const findings: AuditFinding[] = []

    const sectionsWithRestrictions = admin.sections.filter(
      (s) => s.restrictionText && s.restrictionText.trim().length > 3,
    )

    if (sectionsWithRestrictions.length === 0) return findings

    const firstRestricted = sectionsWithRestrictions[0]
    const cleanText = firstRestricted.restrictionText
      .replace(/Show\s+more\s*Show\s+less/gi, '')
      .replace(/\s+/g, ' ')
      .trim()

    const activityNames = new Set<string>()

    const enPattern = /the activity\s+([^,\."]+?)\s+is marked complete/gi
    for (const m of cleanText.matchAll(enPattern)) {
      activityNames.add(m[1].trim())
    }

    const esPattern =
      /[Ll]a actividad\s+([^,\."]+?)\s+(est[ée] marcada como completada|debe marcarse como completada|este[ée] completada)/gi
    for (const m of cleanText.matchAll(esPattern)) {
      activityNames.add(m[1].trim())
    }

    const quotePattern = /["""]([^"""]+?)["""]/g
    for (const m of cleanText.matchAll(quotePattern)) {
      const name = m[1].trim()
      if (name.length > 2 && name.length < 120) activityNames.add(name)
    }

    const cascadeCount = sectionsWithRestrictions.length - 1

    for (const required of activityNames) {
      const normalized = required.toLowerCase()
      const matchingActivity = admin.sections
        .flatMap((s) => s.activities)
        .find(
          (a) =>
            a.name.toLowerCase().includes(normalized) || normalized.includes(a.name.toLowerCase()),
        )

      if (!matchingActivity) {
        findings.push({
          severity: 'critical',
          sectionNumber: firstRestricted.number,
          sectionTitle: firstRestricted.title,
          message: `Actividad requerida "${required}" no encontrada en el curso`,
          detail: `El módulo "${firstRestricted.title}" está bloqueado por "${required}" según su condición de disponibilidad, pero no existe ninguna actividad con ese nombre en el curso. Esto impide el avance de cualquier estudiante nuevo.`,
          priority: 'high',
          actionItem:
            'Agregar la actividad faltante o corregir la condición de disponibilidad en la configuración del módulo bloqueado.',
        })
      } else if (!matchingActivity.hasCompletionTracking) {
        const actSection = admin.sections.find((s) =>
          s.activities.some((a) => a.name === matchingActivity.name),
        )
        const modData = apiModuleData?.get(matchingActivity.name.toLowerCase())
        if (modData?.isautomatic === true) {
          continue
        }
        let severity: 'critical' | 'warning' = 'critical'
        let detail: string
        if (modData?.completion === 1) {
          severity = 'warning'
          detail = `Para desbloquear "${firstRestricted.title}" hace falta que "${required}" esté completada. El servidor indica que el seguimiento es manual (completion=1), pero la casilla de verificación no se renderiza en la página. Posible bug de interfaz o permiso faltante.`
        } else {
          detail = `Para desbloquear "${firstRestricted.title}" hace falta que "${required}" esté completada, pero al recorrer el curso como alumno nuevo no encontramos ninguna forma de marcarla como completada (no hay casilla de verificación ni progreso automático). Esto impide el avance a "${firstRestricted.title}" y a los módulos siguientes.`
        }
        findings.push({
          severity,
          sectionNumber: actSection?.number ?? firstRestricted.number,
          sectionTitle: actSection?.title ?? firstRestricted.title,
          message: `"${required}" está en "${actSection?.title ?? '?'}" pero no puede marcarse como completada`,
          detail,
          priority: 'high',
          actionItem:
            'Agregar la actividad faltante o corregir la condición de disponibilidad en la configuración del módulo bloqueado.',
        })
      }
    }

    if (cascadeCount > 0) {
      const cascadeNames = sectionsWithRestrictions
        .slice(1)
        .map((s) => `"${s.title}"`)
        .join(', ')
      findings.push({
        severity: 'info',
        sectionNumber: firstRestricted.number,
        sectionTitle: firstRestricted.title,
        message: `${cascadeCount} módulo(s) dependen de "${firstRestricted.title}"`,
        detail: `Los módulos ${cascadeNames} están bloqueados porque dependen de "${firstRestricted.title}". No es un error nuevo — es consecuencia de la restricción anterior.`,
        priority: 'low',
        actionItem: 'No requiere acción directa — es consecuencia del hallazgo anterior.',
      })
    }

    if (student) {
      const visibleStudentActivities = new Set(
        student.sections
          .flatMap((s) => s.activities)
          .filter((a) => a.isVisible)
          .map((a) => a.name.toLowerCase()),
      )

      const visibilityPhantoms: AuditFinding[] = []
      const checkedNames = new Set<string>()

      for (const required of activityNames) {
        const normalized = required.toLowerCase()
        if (checkedNames.has(normalized)) continue
        checkedNames.add(normalized)

        const existsInAdmin = admin.sections
          .flatMap((s) => s.activities)
          .some(
            (a) =>
              a.name.toLowerCase().includes(normalized) ||
              normalized.includes(a.name.toLowerCase()),
          )
        if (!existsInAdmin) continue

        const existsInStudent = Array.from(visibleStudentActivities).some(
          (v) => v.includes(normalized) || normalized.includes(v),
        )

        if (!existsInStudent) {
          visibilityPhantoms.push({
            severity: 'critical',
            sectionNumber: firstRestricted.number,
            sectionTitle: firstRestricted.title,
            message: `"${required}" existe en el curso pero NO es visible para estudiantes`,
            detail: `El recurso "${required}" aparece en la vista de administrador pero no está disponible para los estudiantes. Las condiciones de disponibilidad del módulo bloqueado requieren esta actividad, creando un punto muerto.`,
            actionItem:
              'Revisar visibilidad del recurso en la configuración del curso. Si debe estar disponible para estudiantes, cambiar visible=1 en los ajustes del módulo.',
            priority: 'high',
          })
        }
      }

      findings.push(...visibilityPhantoms)
    }

    if (nelthorData) {
      for (const finding of findings) {
        if (finding.severity !== 'critical') continue
        const nameMatch = finding.message.match(/"([^"]+?)"/)
        if (!nameMatch) continue
        const originalName = nameMatch[1]
        const nelthorEntry = nelthorData.get(originalName.toLowerCase())
        if (nelthorEntry && nelthorEntry.state === 1) {
          finding.severity = 'info'
          finding.priority = 'low'
          finding.detail +=
            ' [Nelthor (estudiante real) completó esta actividad sin problemas antes de ser administrador. Esto no bloqueó su avance. El hallazgo puede deberse a un cambio posterior en la configuración del curso.]'
        }
      }
    }

    return findings
  }

  @atc('MC-8', { story: 'UNC-RE-1', feature: 'Course Scan' })
  async getActivityCompletionReport(courseId: string): Promise<ActivityCompletionSummary[]> {
    await this.page.goto(`${this.baseUrl}/report/completion/index.php?course=${courseId}`)
    await this.page.waitForLoadState('load')
    await this.page
      .locator('table')
      .first()
      .waitFor({ state: 'visible', timeout: 15000 })
      .catch(() => {})

    return this.page.evaluate(() => {
      const table = document.querySelector('table')
      if (!table) return []

      const rows = Array.from(table.querySelectorAll('tr'))
      if (rows.length < 2) return []

      const headerCells = rows[0].querySelectorAll('th, td')
      const activityNames: string[] = []
      const sectionNames: string[] = []
      for (let c = 0; c < headerCells.length; c++) {
        const text = headerCells[c].textContent?.trim() || ''
        if (text && text !== 'Nombre' && text !== 'Apellido' && text !== 'Nombre/Apellido') {
          const cellHtml = headerCells[c].innerHTML
          const secMatch = cellHtml.match(/<br\s*\/?>\s*(.+?)(?:\s*<|$)/i)
          sectionNames.push(secMatch ? secMatch[1].trim() : '')
          activityNames.push(text.replace(/<br\s*\/?>.+$/i, '').trim())
        }
      }

      const dataRows = rows.slice(1).filter((r) => r.querySelector('td, th'))
      const totalStudents = dataRows.length
      if (totalStudents === 0) return []

      const completedCounts: number[] = new Array(activityNames.length).fill(0)
      for (const row of dataRows) {
        const cells = row.querySelectorAll('td, th')
        let actCol = 0
        const nameCols = cells.length - activityNames.length
        for (let c = nameCols; c < cells.length && actCol < activityNames.length; c++, actCol++) {
          const checkbox = cells[c].querySelector('input[type="checkbox"]:checked')
          if (checkbox) completedCounts[actCol]++
        }
      }

      return activityNames.map((name, i) => ({
        activityName: name,
        sectionName: sectionNames[i] || '',
        totalStudents,
        completedCount: completedCounts[i],
        completionRate:
          totalStudents > 0 ? Math.round((completedCounts[i] / totalStudents) * 10000) / 100 : 0,
      }))
    })
  }
}
