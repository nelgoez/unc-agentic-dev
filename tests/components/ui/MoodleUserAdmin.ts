import type { Page } from '@playwright/test'
import { atc } from '../../utils/decorators'

export interface CreatedUser {
  username: string
  password: string
  firstName: string
  lastName: string
  email: string
}

export enum MoodleRole {
  Student = 5,
  Teacher = 4,
  EditingTeacher = 3,
  CourseCreator = 2,
  Manager = 1,
}

export class MoodleUserAdmin {
  private page: Page
  private baseUrl: string

  constructor(page: Page, baseUrl: string) {
    this.page = page
    this.baseUrl = baseUrl
  }

  @atc('MUA-1', { story: 'UNC-MVP-1', feature: 'User Creation' })
  async createUser(prefix: string = 'test'): Promise<CreatedUser> {
    const suffix = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    const user: CreatedUser = {
      username: `${prefix}-${suffix}`,
      password: 'TempPIA01!',
      firstName: `${prefix.charAt(0).toUpperCase() + prefix.slice(1)}`,
      lastName: `User-${suffix.slice(0, 4)}`,
      email: `${prefix}.${suffix}@test.unc.edu.ar`,
    }

    await this.page.goto(`${this.baseUrl}/user/editadvanced.php?id=-1`)
    await this.page.waitForLoadState('load')

    await this.page.locator('#id_username').waitFor({ state: 'visible', timeout: 15000 })
    await this.page.locator('#id_username').fill(user.username)
    await this.page.locator('#id_newpassword').fill(user.password)
    await this.page.locator('#id_firstname').fill(user.firstName)
    await this.page.locator('#id_lastname').fill(user.lastName)
    await this.page.locator('#id_email').fill(user.email)

    await this.page.locator('#id_submitbutton').click()
    await this.page.waitForLoadState('load')

    const error = await this.page
      .locator('.error, .alert-danger, .notifyproblem')
      .first()
      .isVisible()
      .catch(() => false)
    if (error) {
      const msg = await this.page
        .locator('.error, .alert-danger, .notifyproblem')
        .first()
        .textContent()
      throw new Error(`User creation failed for ${user.username}: ${msg}`)
    }

    return user
  }

  @atc('MUA-2', { story: 'UNC-MVP-1', feature: 'Course Enrollment' })
  async enrolUser(
    courseId: string,
    user: CreatedUser,
    role: MoodleRole = MoodleRole.Student,
  ): Promise<void> {
    await this.page.goto(`${this.baseUrl}/enrol/users.php?id=${courseId}`)
    await this.page.waitForLoadState('load')

    const enrolButton = this.page
      .locator(
        'button:has-text("Enrol users"), a:has-text("Enrol users"), button:has-text("Inscribir"), a:has-text("Inscribir")',
      )
      .first()
    if (await enrolButton.isVisible().catch(() => false)) {
      await enrolButton.click()
      await this.page.waitForTimeout(500)
    }

    const searchInput = this.page
      .locator(
        '#enrolusersmodal input[type="search"], #id_enrolusersmodal input[type="search"], input.user-selector-search, input[placeholder*="Search"], input[placeholder*="Buscar"]',
      )
      .first()
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill(user.username)
      await this.page.waitForTimeout(1000)

      const userOption = this.page
        .locator(
          `.user-selector-option:has-text("${user.username}"), li:has-text("${user.username}"), [role="option"]:has-text("${user.username}")`,
        )
        .first()
      if (await userOption.isVisible({ timeout: 5000 }).catch(() => false)) {
        await userOption.click()
      }
    }

    const roleSelect = this.page.locator(
      '#enrolusersmodal select, select#id_roletoassign, select[name="roletoassign"]',
    )
    if (await roleSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await roleSelect.selectOption(String(role))
    }

    const finishButton = this.page
      .locator(
        '#enrolusersmodal button:has-text("Finish"), #enrolusersmodal input[value="Finish"], button:has-text("Finalizar"), input[value="Finalizar"]',
      )
      .first()
    if (await finishButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await finishButton.click()
      await this.page.waitForTimeout(1000)
    }
  }

  @atc('MUA-3', { story: 'UNC-MVP-1', feature: 'Cleanup' })
  async deleteUser(username: string): Promise<void> {
    await this.page.goto(`${this.baseUrl}/admin/user.php`)
    await this.page.waitForLoadState('load')

    const searchInput = this.page
      .locator('input[name="search"], input[placeholder*="Search"], input[placeholder*="Buscar"]')
      .first()
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.fill(username)
      await this.page
        .locator('input[name="searchbtn"], button:has-text("Search"), button:has-text("Buscar")')
        .first()
        .click()
      await this.page.waitForLoadState('load')
    }

    const deleteLink = this.page.locator(`a:has-text("${username}")`).first()
    if (await deleteLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await deleteLink.click()
      await this.page.waitForLoadState('load')
    }
  }
}
