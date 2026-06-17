declare const process: any
import { expect, test } from '@playwright/test'

test.describe('Campus Virtual Course Structure Validation', () => {
  const baseURL: string = process.env.MOODLE_BASE_URL || 'https://campus.aulavirtual.unc.edu.ar'
  const username: string = process.env.STUDENT_USERNAME
  const password: string = process.env.STUDENT_PASSWORD
  const courseId: string = process.env.TEST_COURSE_ID || '269'

  if (!username || !password) {
    throw new Error('STUDENT_USERNAME and STUDENT_PASSWORD must be set in .env')
  }

  test.beforeEach(async ({ page }) => {
    // Directly navigate to the course page assuming session is already authenticated
    await page.goto(`${baseURL}/course/view.php?id=${courseId}`)
    await page.waitForLoadState('networkidle')
  })

  test('should load course page and detect hidden required resources', async ({ page }) => {
    // Navigate to course
    await page.goto(`${baseURL}/course/view.php?id=${courseId}`)
    await page.waitForLoadState('networkidle')

    // Check if we are on the course page

    // Get all section titles or activity names
    const activityNames = await page.$$eval('.activityname', (els) =>
      els.map((el) => el.textContent?.trim()),
    )
    console.log('Found activities:', activityNames)

    // Look for any activity that is marked as hidden (e.g., has class 'dimmed' or 'hidden')
    const hiddenActivities = await page.$$eval(
      '.activityname.dimmed, .activityname.hidden',
      (els) => els.map((el) => el.textContent?.trim()),
    )
    console.log('Hidden activities:', hiddenActivities)

    // If there are hidden activities, we should warn
    if (hiddenActivities.length > 0) {
      console.warn(
        `Found ${hiddenActivities.length} hidden activities: ${hiddenActivities.join(', ')}`,
      )
      // Optionally fail the test if hidden activities are considered a problem
      // expect(hiddenActivities.length).toBe(0);
    }

    // Additionally, check for completion tracking icons
    const completionIcons = await page.$$eval('.activity-completion', (els) => els.length)
    console.log(`Found ${completionIcons} completion icons`)

    // Try to find any element that indicates a required resource is missing
    // For example, look for text like "Required" or "Obligatorio" near hidden elements
    const requiredHidden = await page.$$eval(
      '.dimmed:has-text("Required"), .hidden:has-text("Obligatorio")',
      (els) => els.length,
    )
    if (requiredHidden > 0) {
      console.warn('Found required resources that are hidden')
    }

    // Screenshot for debugging
    await page.screenshot({ path: `test-results/course-${courseId}.png` })
  })
})
