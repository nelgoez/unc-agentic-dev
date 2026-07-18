import type { Page } from '@playwright/test'
import { atc } from '../../utils/decorators'

export interface ActivityData {
  name: string
  type: string
  href: string
  isVisible: boolean
  hasCompletionTracking: boolean
  isComplete: boolean
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

        return {
          name,
          type: modType,
          href: linkEl?.getAttribute('href') || '',
          isVisible: !isDimmed,
          hasCompletionTracking: hasCheckbox || !!autoComplete,
          isComplete: checkboxChecked || false,
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

  findPhantoms(student: CourseStructure): AuditFinding[] {
    const findings: AuditFinding[] = []

    const lockedSections = student.sections.filter((s) => s.isLocked)
    const firstLocked = lockedSections[0] || null

    if (!firstLocked) return findings

    // Analyze only the first locked section in detail (root cause)
    const cleanRestriction = firstLocked.restrictionText
      .replace(/Show\s+more\s*Show\s+less/gi, '')
      .replace(/\s+/g, ' ')
      .trim()

    if (cleanRestriction.length > 0) {
      const seen = new Set<string>()
      const regex = /the activity[\x20\t]+([^\n,]+?)[\x20\t]+is marked complete/gi
      for (const m of cleanRestriction.matchAll(regex)) {
        const name = m[1].trim()
        if (!seen.has(name)) {
          seen.add(name)
          const normalized = name.toLowerCase()
          const matchingActivity = student.sections
            .flatMap((s) => s.activities)
            .find(
              (a) =>
                a.name.toLowerCase().includes(normalized) ||
                normalized.includes(a.name.toLowerCase()),
            )

          if (!matchingActivity) {
            findings.push({
              severity: 'critical',
              sectionNumber: firstLocked.number,
              sectionTitle: firstLocked.title,
              message: `Actividad requerida "${name}" no encontrada en el curso`,
              detail: `El módulo "${firstLocked.title}" está bloqueado y requiere "${name}" para desbloquearse, pero no existe ninguna actividad con ese nombre. Causa probable: condición de finalización configurada sobre un recurso (PDF, video) que no es una actividad de Moodle, o la actividad fue eliminada pero la condición persiste.`,
            })
          } else if (!matchingActivity.hasCompletionTracking) {
            findings.push({
              severity: 'critical',
              sectionNumber: firstLocked.number,
              sectionTitle: firstLocked.title,
              message: `Actividad "${name}" no tiene seguimiento de finalización`,
              detail: `"${firstLocked.title}" requiere "${name}" como condición de avance, pero esta actividad no tiene habilitado el seguimiento de finalización. Moodle nunca podrá marcarlo como completado. Solución: habilitar seguimiento de finalización en la configuración de "${name}".`,
            })
          }
        }
      }
    }

    // Cascade: single consolidated note for all subsequent locked modules
    const cascadeCount = lockedSections.length - 1
    if (cascadeCount > 0) {
      const cascadeNames = lockedSections
        .slice(1)
        .map((s) => `"${s.title}"`)
        .join(', ')
      findings.push({
        severity: 'info',
        sectionNumber: firstLocked.number,
        sectionTitle: firstLocked.title,
        message: `${cascadeCount} módulo(s) bloqueado(s) en cascada tras "${firstLocked.title}"`,
        detail: `Los siguientes módulos están bloqueados en cascada: ${cascadeNames}. No es un error adicional — es consecuencia directa del bloqueo en "${firstLocked.title}". Al resolver la causa raíz, todos se desbloquean automáticamente.`,
      })
    }

    // Bonus: check for sections accessible despite previous lock (actual structural bug)
    if (firstLocked) {
      const firstIdx = student.sections.indexOf(firstLocked)
      const accessibleAfterLock = student.sections.slice(firstIdx + 1).filter((s) => !s.isLocked)
      if (accessibleAfterLock.length > 0) {
        findings.push({
          severity: 'warning',
          sectionNumber: accessibleAfterLock[0].number,
          sectionTitle: accessibleAfterLock[0].title,
          message: `Módulo accesible a pesar de tener módulos anteriores bloqueados`,
          detail: `"${accessibleAfterLock[0].title}" está accesible para estudiantes aunque "${firstLocked.title}" está bloqueado. Esto puede indicar una configuración incorrecta de dependencias o un error en las condiciones de acceso.`,
        })
      }
    }

    return findings
  }
}
