import { resolve } from 'node:path'
import { test } from '@playwright/test'
import { createFixture } from '../components/UiFixture'
import { MoodleLogin } from '../components/ui/MoodleLogin'
import { MoodleCourse } from '../components/ui/MoodleCourse'

const courseId = '269'
const outDir = resolve('reports/admin-explore')

test.describe('Admin Exploration — KATA', () => {
  test('Explore Módulo 3 with Edit Mode to inspect phantom activity config', async ({ page }) => {
    const { ctx } = createFixture(page)
    const login = new MoodleLogin(page, ctx.env.baseUrl)
    const course = new MoodleCourse(page, ctx.env.baseUrl)

    // 1. Login as admin
    await login.loginAsAdmin()

    // 2. Go to course
    await course.goToCourse(courseId)

    // 3. Enable Edit Mode
    const editToggle = page
      .locator(
        '#region-main input[type="checkbox"][name="setmode"], .editmode-toggle input[type="checkbox"], a:has-text("Activar edición"), a:has-text("Edit mode")',
      )
      .first()
    if (await editToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      const isChecked = await editToggle.isChecked().catch(() => false)
      if (!isChecked) {
        await editToggle.click()
        await page.waitForLoadState('load')
      }
    } else {
      const editLink = page
        .locator('a:has-text("Activar edición"), a:has-text("Edit mode")')
        .first()
      if (await editLink.isVisible({ timeout: 3000 }).catch(() => false)) {
        await editLink.click()
        await page.waitForLoadState('load')
      }
    }
    console.warn('Edit Mode enabled')

    // 4. Screenshot: course in edit mode (viewport only)
    await page
      .locator('.course-content')
      .first()
      .scrollIntoViewIfNeeded()
      .catch(() => {})
    await page.screenshot({ path: `${outDir}/01-course-edit-mode.png`, fullPage: false })

    // 5. Navigate to Módulo 3
    await course.navigateToSection(3)

    // 6. Dump all activities in section 3
    interface SectionActivity {
      html: string
      classes: string[]
      name: string
      type: string
      hasCompletion: boolean
      completionHtml: string
      isDimmed: boolean
      cmid: string
    }
    const section3Data: SectionActivity[] = await page.evaluate(() => {
      const section = document.querySelector('#section-3, li#section-3')
      if (!section) return []
      return Array.from(section.querySelectorAll('.activity')).map((act) => ({
        html: act.outerHTML.substring(0, 800),
        classes: Array.from(act.classList),
        name: act.querySelector('[data-activityname]')?.getAttribute('data-activityname') || '',
        type:
          Array.from(act.classList)
            .find((c) => c.startsWith('modtype_'))
            ?.replace('modtype_', '') || 'unknown',
        hasCompletion: !!act.querySelector('.activity-completion'),
        completionHtml:
          act.querySelector('.activity-completion')?.outerHTML?.substring(0, 400) || '',
        isDimmed: act.classList.contains('dimmed'),
        cmid: act.getAttribute('data-cmid') || act.getAttribute('id') || '',
      }))
    })

    console.warn(`\n=== Section 3 Activities (${section3Data.length} total) ===`)
    for (const act of section3Data) {
      console.warn(`\n--- ${act.name} (${act.type}) ---`)
      console.warn(
        `  Has completion: ${act.hasCompletion} | Dimmed: ${act.isDimmed} | CMID: ${act.cmid}`,
      )
    }

    // 7. Check the availability restriction
    const availabilityDetails = await page.evaluate(() => {
      const section = document.querySelector('#section-3, li#section-3')
      if (!section) return null
      const avail = section.querySelector(
        '.availabilityinfo, .section_availability, .restriction-message',
      )
      return {
        html: avail?.outerHTML?.substring(0, 1000) || '',
        text: avail?.textContent?.trim()?.substring(0, 500) || '',
        classes: Array.from(avail?.classList || []),
      }
    })
    console.warn(`\n=== Módulo 3 restriction ===`)
    console.warn(availabilityDetails?.text || 'none')

    // 8. Screenshot of Módulo 3 (viewport only)
    await page
      .locator('#section-3')
      .first()
      .scrollIntoViewIfNeeded()
      .catch(() => {})
    await page.screenshot({ path: `${outDir}/02-mod3-admin-full.png`, fullPage: false })
    console.warn(`\nScreenshots in: ${outDir}/`)
  })
})
