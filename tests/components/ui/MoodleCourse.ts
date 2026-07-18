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

  findPhantoms(admin: CourseStructure): AuditFinding[] {
    const findings: AuditFinding[] = []

    // Parse restriction text from ADMIN view — admins can see availability conditions
    // even though they're not blocked by them. This works regardless of role switch.
    const sectionsWithRestrictions = admin.sections.filter(
      (s) => s.restrictionText && s.restrictionText.trim().length > 3,
    )

    if (sectionsWithRestrictions.length === 0) return findings

    const firstRestricted = sectionsWithRestrictions[0]
    const cleanText = firstRestricted.restrictionText
      .replace(/Show\s+more\s*Show\s+less/gi, '')
      .replace(/\s+/g, ' ')
      .trim()

    // Bilingual extraction: match activity names in both English and Spanish.
    // Patterns in the restriction text:
    //   EN: "the activity Activity Name is marked complete"
    //   ES: "la actividad Nombre de Actividad esté marcada como completada"
    // Also match anything in quotes: "Activity Name"
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

    // Also extract anything in quotes (both languages use quotes for activity names)
    const quotePattern = /["""]([^"""]+?)["""]/g
    for (const m of cleanText.matchAll(quotePattern)) {
      const name = m[1].trim()
      if (name.length > 2 && name.length < 120) activityNames.add(name)
    }

    // Cascade count: modules after the first restricted one
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
          detail: `El módulo "${firstRestricted.title}" está bloqueado por "${required}" según su condición de disponibilidad, pero no existe ninguna actividad con ese nombre. Causa probable: la condición apunta a un recurso (PDF, URL) que no tiene seguimiento de finalización, o la actividad fue eliminada pero la condición persiste.${cascadeCount > 0 ? ` Además, ${cascadeCount} módulo(s) más están bloqueados en cascada.` : ''}`,
        })
      } else if (!matchingActivity.hasCompletionTracking) {
        findings.push({
          severity: 'critical',
          sectionNumber: firstRestricted.number,
          sectionTitle: firstRestricted.title,
          message: `Actividad "${required}" no tiene seguimiento de finalización`,
          detail: `"${firstRestricted.title}" requiere "${required}" como condición de avance, pero esta actividad no tiene habilitado el seguimiento de finalización. Moodle nunca podrá marcarlo como completado aunque el estudiante la visite. Solución: habilitar seguimiento de finalización en la configuración de "${required}".${cascadeCount > 0 ? ` Al resolver esto, los ${cascadeCount} módulo(s) en cascada también se desbloquean.` : ''}`,
        })
      }
    }

    // Cascade note
    if (cascadeCount > 0) {
      const cascadeNames = sectionsWithRestrictions
        .slice(1)
        .map((s) => `"${s.title}"`)
        .join(', ')
      findings.push({
        severity: 'info',
        sectionNumber: firstRestricted.number,
        sectionTitle: firstRestricted.title,
        message: `${cascadeCount} módulo(s) bloqueado(s) en cascada tras "${firstRestricted.title}"`,
        detail: `Los siguientes módulos están bloqueados en cascada: ${cascadeNames}. No es un error adicional — es consecuencia directa de la restricción en "${firstRestricted.title}". Al resolver la causa raíz, todos se desbloquean.`,
      })
    }

    return findings
  }
}
