import type { Page } from '@playwright/test'
import { atc } from '../../utils/decorators'

export enum MoodleRole {
  Admin = 0,
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
      const meta = document.querySelector('meta[name="sesskey"]')
      if (meta) return meta.getAttribute('content') || ''
      const script = Array.from(document.querySelectorAll('script')).find((s) =>
        s.textContent?.includes('sesskey'),
      )
      if (script) {
        const match = script.textContent?.match(/sesskey["']?\s*[:=]\s*["']([^"']+)["']/)
        if (match) return match[1]
      }
      return ''
    })
  }

  @atc('MRS-2', { story: 'UNC-RE-1', feature: 'Role Switching' })
  async switchTo(courseId: string, role: MoodleRole): Promise<void> {
    const sesskey = await this.getSesskey()
    const url = `${this.baseUrl}/course/switchrole.php?id=${courseId}&sesskey=${sesskey}&switchrole=${role}&returnurl=${encodeURIComponent(`/course/view.php?id=${courseId}`)}`
    await this.page.goto(url)
    await this.page.waitForLoadState('load')
    await this.page
      .locator('.course-content, .nav-tabs, #page-content')
      .first()
      .waitFor({ state: 'visible', timeout: 15000 })
      .catch(() => {})
  }

  @atc('MRS-3', { story: 'UNC-RE-1', feature: 'Role Switching' })
  async switchToStudent(courseId: string): Promise<void> {
    await this.switchTo(courseId, MoodleRole.Student)
  }

  @atc('MRS-4', { story: 'UNC-RE-1', feature: 'Role Switching' })
  async switchToTeacher(courseId: string): Promise<void> {
    await this.switchTo(courseId, MoodleRole.Teacher)
  }

  @atc('MRS-5', { story: 'UNC-RE-1', feature: 'Role Switching' })
  async switchToEditingTeacher(courseId: string): Promise<void> {
    await this.switchTo(courseId, MoodleRole.EditingTeacher)
  }

  @atc('MRS-6', { story: 'UNC-RE-1', feature: 'Role Switching' })
  async revertToAdmin(courseId: string): Promise<void> {
    await this.switchTo(courseId, MoodleRole.Admin)
  }

  @atc('MRS-7', { story: 'UNC-RE-1', feature: 'Role Switching' })
  async getCurrentRoleLabel(): Promise<string> {
    return this.page.evaluate(() => {
      const userMenu = document.querySelector('.usermenu, .userdropdown, [data-region="user-menu"]')
      if (!userMenu) return ''
      const text = userMenu.textContent?.trim() || ''
      const match = text.match(/\(([^)]+)\)/)
      return match ? match[1] : ''
    })
  }

  @atc('MRS-8', { story: 'UNC-RE-1', feature: 'Role Switching' })
  async switchToStudentAndVerify(courseId: string, retries = 2): Promise<boolean> {
    for (let i = 0; i <= retries; i++) {
      await this.switchToStudent(courseId)
      await this.page.waitForTimeout(1000)
      const label = await this.getCurrentRoleLabel()
      if (label.toLowerCase().includes('student')) return true
      console.warn(`Role switch attempt ${i + 1}: got "${label}", expected "student". Retrying...`)
    }
    return false
  }
}
