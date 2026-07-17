import type { Page } from '@playwright/test'
import { atc } from '../../utils/decorators'

export { atc }

export class MoodleLogin {
  private page: Page
  private baseUrl: string

  constructor(page: Page, baseUrl: string) {
    this.page = page
    this.baseUrl = baseUrl
  }

  @atc('ML-1', { story: 'UNC-RE-1', feature: 'Moodle Login' })
  async loginAs(username: string, password: string): Promise<void> {
    await this.page.goto(`${this.baseUrl}/login/index.php`)
    await this.page.waitForLoadState('load')
    await this.page.locator('#username').waitFor({ state: 'visible', timeout: 15000 })
    await this.page.locator('#username').fill(username)
    await this.page.locator('#password').fill(password)
    await this.page.locator('#loginbtn').click()
    await this.page.waitForLoadState('load')
    if (this.page.url().includes('login/index.php')) {
      throw new Error(`Login failed for ${username} — still at login page`)
    }
  }

  @atc('ML-2', { story: 'UNC-RE-1', feature: 'Moodle Login' })
  async loginAsStudent(): Promise<void> {
    await this.loginAs(
      process.env.STUDENT_USERNAME ?? '',
      (process.env.STUDENT_PASSWORD ?? '').trim(),
    )
  }

  @atc('ML-3', { story: 'UNC-RE-1', feature: 'Moodle Login' })
  async loginAsAdmin(): Promise<void> {
    await this.loginAs(
      process.env.STUDENT_USERNAME ?? '',
      (process.env.STUDENT_PASSWORD ?? '').trim(),
    )
  }
}
