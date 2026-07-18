import type { Page } from '@playwright/test'
import { atc } from '../../utils/decorators'

export enum MoodleRole {
  Default = 0,
  Manager = 1,
  CourseCreator = 2,
  EditingTeacher = 3,
  Teacher = 4,
  Student = 5,
  Guest = 6,
}

export class MoodleRoleSwitch {
  private page: Page
  private baseUrl: string

  constructor(page: Page, baseUrl: string) {
    this.page = page
    this.baseUrl = baseUrl
  }

  @atc('MRS-1', { story: 'UNC-RE-1', feature: 'Role Switching' })
  async getSesskey(): Promise<string> {
    return this.page.evaluate(() => {
      const html = document.documentElement.innerHTML

      const checks: string[] = []

      const meta = document.querySelector('meta[name="sesskey"]')
      if (meta) checks.push(`meta: ${meta.getAttribute('content')}`)

      const input = document.querySelector<HTMLInputElement>('input[name="sesskey"]')
      if (input) checks.push(`input: ${input.value}`)

      for (const script of Array.from(document.querySelectorAll('script'))) {
        const t = script.textContent || ''
        const m = t.match(/sesskey["']?\s*[:=]\s*["']([^"']+)["']/)
        if (m) {
          checks.push(`script: ${m[1]}`)
          break
        }
      }

      const htmlMatch = html.match(/sesskey["']?\s*[:=]\s*["']([^"']+?)["']/)
      if (htmlMatch) checks.push(`html: ${htmlMatch[1]}`)

      for (const c of checks) {
        const val = c.split(': ')[1]
        if (val && val.length > 5) return val
      }
      return ''
    })
  }

  @atc('MRS-2', { story: 'UNC-RE-1', feature: 'Role Switching' })
  async switchTo(courseId: string, role: MoodleRole): Promise<boolean> {
    const sesskey = await this.getSesskey()
    if (!sesskey || sesskey.length < 5) {
      console.warn(`Invalid sesskey "${sesskey}" — role switch may fail`)
    }

    const url = `${this.baseUrl}/course/switchrole.php?id=${courseId}&sesskey=${sesskey}&switchrole=${role}`
    await this.page.goto(url, { waitUntil: 'load' })
    await this.page.waitForTimeout(1500)

    const currentUrl = this.page.url()
    const label = await this.getCurrentRoleLabel()
    console.log(
      `  Switched to role ${role} (${MoodleRole[role] || 'unknown'}) — label: "${label || 'N/A'}" — URL: ${currentUrl.includes('course/view.php') ? 'course page' : 'other'}`,
    )

    const isDefault = role === MoodleRole.Default
    if (isDefault) return true
    const expectedName = MoodleRole[role]?.toLowerCase() || ''
    return label.toLowerCase().includes(expectedName) || label.toLowerCase().includes('student')
  }

  @atc('MRS-3', { story: 'UNC-RE-1', feature: 'Role Switching' })
  async switchToStudent(courseId: string): Promise<boolean> {
    return await this.switchTo(courseId, MoodleRole.Student)
  }

  @atc('MRS-4', { story: 'UNC-RE-1', feature: 'Role Switching' })
  async switchToTeacher(courseId: string): Promise<boolean> {
    return await this.switchTo(courseId, MoodleRole.Teacher)
  }

  @atc('MRS-5', { story: 'UNC-RE-1', feature: 'Role Switching' })
  async revertToAdmin(courseId: string): Promise<void> {
    await this.switchTo(courseId, MoodleRole.Default)
    await this.page.goto(`${this.baseUrl}/course/view.php?id=${courseId}`, { waitUntil: 'load' })
  }

  @atc('MRS-6', { story: 'UNC-RE-1', feature: 'Role Switching' })
  async getCurrentRoleLabel(): Promise<string> {
    return this.page.evaluate(() => {
      const userMenu = document.querySelector('.usermenu, .userdropdown, [data-region="user-menu"]')
      if (!userMenu) return ''
      const text = userMenu.textContent?.trim() || ''
      const match = text.match(/\(([^)]+)\)/)
      return match ? match[1] : ''
    })
  }
}
