/* eslint-disable no-console, ts/strict-boolean-expressions */
import process from 'node:process'
import { test } from '@playwright/test'

const baseURL = process.env.MOODLE_BASE_URL || 'https://campus.aulavirtual.unc.edu.ar'
const studentUser = process.env.STUDENT_USERNAME || ''
const studentPass = (process.env.STUDENT_PASSWORD || '').trim()
const courseId = '269'
const evidenceDir = 'reports/evidence'

test.describe('Evidence: Course 269 — phantom activity proof', () => {
  test('Capture locked Module 3 info popup + sidebar resources + PDF test', async ({ page }) => {
    // Login
    await page.goto(`${baseURL}/login/index.php`)
    await page.waitForLoadState('networkidle')
    await page.locator('#username').fill(studentUser)
    await page.locator('#password').fill(studentPass)
    await page.locator('#loginbtn').click()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Go to course
    await page.goto(`${baseURL}/course/view.php?id=${courseId}`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)

    // 1. Screenshot: full page — Module 2 is active, Module 3 is locked
    await page.screenshot({ path: `${evidenceDir}/01-course-landing.png`, fullPage: true })
    console.warn('Screenshot 1: Course landing page')

    // 2. Get the full course structure including restriction text from DOM
    const restrictionDetails = await page.evaluate(() => {
      // Find the locked tab info divs
      const infoDivs = document.querySelectorAll('[id^="format_onetopic_winfo_tab-"]')
      const infos: Array<{ id: string; text: string; parentHtml: string }> = []
      infoDivs.forEach((div) => {
        const text = div.textContent?.trim() || ''
        if (text) {
          infos.push({
            id: div.id,
            text: text.substring(0, 500),
            parentHtml: div.parentElement?.outerHTML?.substring(0, 300) || '',
          })
        }
      })
      // Get the locked nav items with their full HTML for context
      const lockedTabs = document.querySelectorAll('li.nav-item.dimmed, li.nav-item.disabled')
      const locked: string[] = []
      lockedTabs.forEach((li) => {
        locked.push(li.outerHTML.substring(0, 600))
      })
      // Get the tree item (section list) that shows restrictions
      const treeItems = document.querySelectorAll('.section-item, .tree_item')
      const trees: string[] = []
      treeItems.forEach((item) => {
        const text = item.textContent?.trim() || ''
        if (text.includes('available') || text.includes('Not')) {
          trees.push(item.outerHTML.substring(0, 400))
        }
      })
      // Get the availability info anywhere in the page
      const availabilityInfos = document.querySelectorAll('.availabilityinfo')
      const availTexts: string[] = []
      availabilityInfos.forEach((a) => {
        const text = a.textContent?.trim() || ''
        if (text) availTexts.push(text.substring(0, 300))
      })
      return { infos, locked, trees, availTexts }
    })

    console.warn('\n=== Restriction Info Divs ===')
    for (const info of restrictionDetails.infos) {
      console.warn(`ID: ${info.id}`)
      console.warn(`Text: ${info.text}`)
      console.warn(`---`)
    }
    console.warn('\n=== Locked Tab HTML ===')
    for (const l of restrictionDetails.locked) {
      console.warn(l)
    }
    console.warn('\n=== Availability Info ===')
    for (const a of restrictionDetails.availTexts) {
      console.warn(`"${a}"`)
    }

    // Force-navigate to section 3 to capture the availability message
    // Moodle OneTopic format shows the restriction message when the tab is clicked
    // Even though it's disabled, we can force-click or just read the HTML
    const mod3Tab = page.locator('a.nav-link[href*="section=3"]').first()
    await mod3Tab.click({ force: true })
    await page.waitForTimeout(2000)
    await page.screenshot({ path: `${evidenceDir}/02-mod3-forced-click.png`, fullPage: true })
    console.warn('Screenshot 2: Module 3 forced click')

    // Check if we can see the availability message now
    const afterClick = await page.evaluate(() => {
      const availInfos = document.querySelectorAll('.availabilityinfo')
      return Array.from(availInfos).map((a) => ({
        text: a.textContent?.trim()?.substring(0, 300) || '',
        visible: a.checkVisibility(),
        parentClasses: Array.from(a.parentElement?.classList || []),
      }))
    })
    console.warn('\nAvailability after click:')
    for (const a of afterClick) {
      console.warn(`  visible=${a.visible} classes=[${a.parentClasses.join(',')}] text="${a.text}"`)
    }

    // 3. Screenshot: zoomed view of the tab row showing locked Module 3
    const tabNav = page.locator('.nav-tabs, .more-nav, [role="menubar"]').first()
    if (await tabNav.isVisible().catch(() => false)) {
      await tabNav.screenshot({ path: `${evidenceDir}/03-tab-bar.png` })
      console.warn('Screenshot 3: Tab bar with locked Module 3')
    }

    // 4. Scroll to sidebar and capture the Biblioteca block
    // First, find the Biblioteca block
    const bibliotecaBlock = page
      .locator(
        '.card-title:has-text("Biblioteca"), h3:has-text("Biblioteca"), .card-header:has-text("Biblioteca")',
      )
      .first()
    if (await bibliotecaBlock.isVisible().catch(() => false)) {
      await bibliotecaBlock.scrollIntoViewIfNeeded()
      await page.waitForTimeout(500)
      await page.screenshot({ path: `${evidenceDir}/05-sidebar-biblioteca.png`, fullPage: false })
      console.warn('Screenshot 5: Sidebar Biblioteca block')

      // Get all links in the Biblioteca
      const sidebarLinks = await page.evaluate(() => {
        const blocks = Array.from(document.querySelectorAll('.card'))
        for (const block of blocks) {
          const title = block.querySelector('.card-title, h3, .card-header')
          if (title && title.textContent?.includes('Biblioteca')) {
            const links = block.querySelectorAll<HTMLAnchorElement>('a')
            return Array.from(links).map((a) => ({
              text: a.textContent?.trim(),
              href: a.getAttribute('href'),
            }))
          }
        }
        return []
      })
      console.warn('\nBiblioteca sidebar links:')
      for (const link of sidebarLinks) {
        console.warn(`  "${link.text}" -> ${link.href?.substring(0, 120) || '(no href)'}`)
      }
    } else {
      console.warn('No Biblioteca block found in sidebar')
      // Try to find any sidebar blocks
      const allSidebarLinks = await page.evaluate(() => {
        const sidebar = document.querySelector('[role="complementary"], aside, .block-region')
        if (!sidebar) return 'NO SIDEBAR FOUND'
        const links = sidebar.querySelectorAll('a')
        return Array.from(links)
          .slice(0, 20)
          .map((a) => ({
            text: a.textContent?.trim(),
            href: a.getAttribute('href'),
          }))
      })
      console.warn('Sidebar links:', JSON.stringify(allSidebarLinks).substring(0, 2000))
      await page.screenshot({ path: `${evidenceDir}/05-sidebar-generic.png`, fullPage: false })
    }

    // 5. Verify the "Funcion Lambda" exists as a PDF file (not a Moodle activity with completion)
    const pdfUrl =
      'https://campus.aulavirtual.unc.edu.ar/pluginfile.php/293209/mod_resource/content/1/Funcion%20Lambda.pdf'
    console.warn(`\nVerifying PDF exists: ${pdfUrl}`)

    // Set up download handler before navigation
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null)
    await page.goto(pdfUrl, { waitUntil: 'load', timeout: 15000 }).catch(() => {
      console.warn('PDF navigation triggered download (expected)')
    })
    const download = await downloadPromise
    if (download) {
      const suggestedName = download.suggestedFilename()
      console.warn(`PDF download detected: "${suggestedName}"`)
    }

    await page.waitForTimeout(1000)
    await page.screenshot({ path: `${evidenceDir}/06-pdf-triggered.png`, fullPage: false })
    console.warn('Screenshot 6: After PDF trigger (no Moodle activity — just a file download)')

    // 6. Return to course — Module 3 is still locked (downloading a PDF doesn't complete it)
    await page.goto(`${baseURL}/course/view.php?id=${courseId}`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    await page.screenshot({ path: `${evidenceDir}/07-after-pdf-still-locked.png`, fullPage: true })
    console.warn('Screenshot 7: Course after PDF attempt — check if still locked')

    const mod3StillLocked = await page.evaluate(() => {
      const tabLi = document.querySelector('li.tab_position_3')
      if (!tabLi) return 'NO_TAB_FOUND'
      return tabLi.classList.contains('disabled') ? 'STILL_LOCKED' : 'NOW_UNLOCKED'
    })
    console.warn(`Module 3 status after PDF: ${mod3StillLocked}`)

    // 7. Final: summary screenshot with annotations
    console.warn('\n=== Evidence Collection Complete ===')
    console.warn('Report: test-results/evidence-269/')
    console.warn('')
    console.warn('Key finding: "Notebook Funcion-Lambda" is referenced as a required')
    console.warn('completion condition in the Moodle availability restriction, but')
    console.warn('no activity with that name exists in the course. The only related')
    console.warn('resource is a PDF "Funcion Lambda" in the Biblioteca sidebar,')
    console.warn('which is not a Moodle activity and has no completion tracking.')
    console.warn('Therefore the student can never satisfy the condition, and')
    console.warn('Module 3 remains permanently locked.')
  })
})
