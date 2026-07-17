import { resolve } from 'node:path'
import { test } from '@playwright/test'
import { createFixture } from '../components/UiFixture'
import { MoodleLogin } from '../components/ui/MoodleLogin'
import { MoodleCourse } from '../components/ui/MoodleCourse'

const courseId = process.env.TEST_COURSE_ID || '269'

test.describe('Course Structure Validation — KATA', () => {
  test('should detect hidden activities and completion tracking', async ({ page }) => {
    const { ctx } = createFixture(page)
    const login = new MoodleLogin(page, ctx.env.baseUrl)
    const course = new MoodleCourse(page, ctx.env.baseUrl)

    await login.loginAsStudent()
    await course.goToCourse(courseId)

    const allActivities = await page.locator('.activityname').all()
    const names: string[] = []
    for (const el of allActivities) {
      const text = await el.textContent()
      if (text) names.push(text.trim())
    }
    console.log('Found activities:', names)

    const hiddenActivities = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.activity.dimmed, .activity.hidden'))
        .map(
          (el) =>
            el.querySelector('[data-activityname]')?.getAttribute('data-activityname') ||
            el.querySelector('a')?.textContent?.trim() ||
            'unknown',
        )
        .filter(Boolean)
    })

    if (hiddenActivities.length > 0) {
      console.warn(
        `Found ${hiddenActivities.length} hidden activities: ${hiddenActivities.join(', ')}`,
      )
    }

    const completionCount = await page.locator('.activity-completion').count()
    console.log(`Found ${completionCount} completion icons`)

    await page.screenshot({ path: resolve('test-results', `course-${courseId}.png`) })
  })
})
