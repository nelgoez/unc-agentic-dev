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
    try {
      await this.page.locator('#username').waitFor({ state: 'visible', timeout: 30000 })
    } catch {
      // If #username not found within timeout, check if Moodle shows a CAPTCHA/rate-limit page
      const pageText = await this.page.evaluate(() => document.body?.textContent?.trim() || '')
      const hasCaptcha =
        pageText.toLowerCase().includes('captcha') ||
        pageText.toLowerCase().includes('no soy un robot') ||
        pageText.toLowerCase().includes('are you human') ||
        pageText.toLowerCase().includes('reintentar') ||
        pageText.toLowerCase().includes('try again')
      if (hasCaptcha) {
        throw new Error(`Login blocked by CAPTCHA/rate-limit after multiple rapid attempts`)
      }
      throw new Error(
        `Login page did not render #username field within 30s. Page: ${pageText.substring(0, 200)}`,
      )
    }
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
    await this.loginAs(process.env.ADMIN_USERNAME ?? '', (process.env.ADMIN_PASSWORD ?? '').trim())
  }
}
