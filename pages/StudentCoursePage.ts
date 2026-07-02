/* eslint-disable ts/strict-boolean-expressions */
import type { Page } from '@playwright/test'

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

export class StudentCoursePage {
  private page: Page
  private baseURL: string

  constructor(page: Page, baseURL: string) {
    this.page = page
    this.baseURL = baseURL
  }

  async goto(courseId: string): Promise<void> {
    await this.page.goto(`${this.baseURL}/course/view.php?id=${courseId}`)
    await this.page.waitForLoadState('networkidle')
    await this.page.waitForTimeout(2000)
  }

  async getCourseName(): Promise<string> {
    return this.page.title()
  }

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

        // Clean title: take only the first meaningful line
        const cleanTitle =
          rawTitle
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean)[0] || rawTitle

        // Get restriction from the tab's info div
        const restrictionEl = parentLi?.querySelector(
          '.availabilityinfo, .dimmed_text, .text-muted',
        )
        let restrictionText = restrictionEl?.textContent?.trim() || ''
        if (!restrictionText) {
          // Try the format_onetopic info div
          const infoEl = parentLi?.querySelector('[id^="format_onetopic_winfo_tab-"]')
          if (infoEl) restrictionText = infoEl.textContent?.trim() || ''
        }

        // Clean restriction text: remove Show more/Show less, collapse whitespace
        restrictionText = restrictionText
          .replace(/Show\s+more\s*Show\s+less/gi, '')
          .replace(/\s+/g, ' ')
          .trim()

        // Only keep the first meaningful entry per section
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

  async navigateToSection(sectionNumber: number): Promise<void> {
    await this.page.goto(
      `${this.baseURL}/course/view.php?id=${this.getCourseIdFromUrl()}&section=${sectionNumber}`,
    )
    await this.page.waitForLoadState('networkidle')
    await this.page.waitForTimeout(1500)
  }

  private getCourseIdFromUrl(): string {
    const url = this.page.url()
    const match = url.match(/id=(\d+)/)
    return match ? match[1] : ''
  }

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

  async getSectionRestrictions(sectionNumber: number): Promise<string> {
    return this.page.evaluate((secNum) => {
      // Check the section's own availability info
      const section = document.querySelector(`#section-${secNum}, li#section-${secNum}`)
      if (!section) return ''

      const avail = section.querySelector(
        '.section_availability .availabilityinfo, .availabilityinfo',
      )
      if (avail) return avail.textContent?.trim() || ''

      return ''
    }, sectionNumber)
  }

  async getCurrentSectionTitle(): Promise<string> {
    return this.page.evaluate(() => {
      const el = document.querySelector('.sectionname, .section-title')
      return el?.textContent?.trim() || ''
    })
  }

  async getSectionSummaryText(sectionNumber: number): Promise<string> {
    return this.page.evaluate((secNum) => {
      const section = document.querySelector(`#section-${secNum}, li#section-${secNum}`)
      if (!section) return ''
      const summary = section.querySelector('.summarytext')
      return summary?.textContent?.trim().substring(0, 500) || ''
    }, sectionNumber)
  }

  async takeScreenshot(filename: string): Promise<void> {
    await this.page.screenshot({ path: filename, fullPage: true })
  }

  async getCourseId(): Promise<string> {
    return this.getCourseIdFromUrl()
  }

  async getCourseUrl(): Promise<string> {
    return this.page.url()
  }

  async analyze(courseId: string): Promise<CourseStructure> {
    await this.goto(courseId)

    const courseName = await this.getCourseName()
    const courseUrl = await this.getCourseUrl()
    const tabs = await this.getTabs()

    const sections: SectionData[] = []
    for (const tab of tabs) {
      await this.navigateToSection(tab.sectionNumber)

      const title = await this.getCurrentSectionTitle()
      const activities = await this.getSectionActivities(tab.sectionNumber)
      const restrictionText =
        tab.restrictionText || (await this.getSectionRestrictions(tab.sectionNumber))

      const allVisibleComplete = activities
        .filter((a) => a.isVisible && a.hasCompletionTracking)
        .every((a) => a.isComplete)

      sections.push({
        number: tab.sectionNumber,
        title: title || tab.title,
        isLocked: tab.isDisabled,
        restrictionText,
        activities,
        allVisibleComplete:
          activities.filter((a) => a.isVisible).length === 0 ? false : allVisibleComplete,
      })
    }

    return { courseName, courseUrl, tabs, sections }
  }
}
