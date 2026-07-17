import { resolve } from 'node:path'
import { test } from '@playwright/test'
import { createFixture } from '../components/UiFixture'
import { MoodleLogin } from '../components/ui/MoodleLogin'
import { MoodleCourse } from '../components/ui/MoodleCourse'

const courseId = '269'
const evidenceDir = resolve('reports/evidence')

test.describe('Evidence: Course 269 — phantom activity proof — KATA', () => {
  test('Capture locked Module 3 info popup + sidebar resources + PDF test', async ({ page }) => {
    const { ctx } = createFixture(page)
    const login = new MoodleLogin(page, ctx.env.baseUrl)
    const course = new MoodleCourse(page, ctx.env.baseUrl)

    await login.loginAsStudent()
    await course.goToCourse(courseId)

    await page
      .locator('.course-content')
      .first()
      .scrollIntoViewIfNeeded()
      .catch(() => {})
    await page.screenshot({ path: resolve(evidenceDir, '01-course-landing.png'), fullPage: false })

    const restrictionDetails = await page.evaluate(() => {
      const infoDivs = document.querySelectorAll('[id^="format_onetopic_winfo_tab-"]')
      const infos: Array<{ id: string; text: string; parentHtml: string }> = []
      infoDivs.forEach((div) => {
        const text = div.textContent?.trim() || ''
        if (text)
          infos.push({
            id: div.id,
            text: text.substring(0, 500),
            parentHtml: div.parentElement?.outerHTML?.substring(0, 300) || '',
          })
      })
      const lockedTabs = document.querySelectorAll('li.nav-item.dimmed, li.nav-item.disabled')
      const locked: string[] = []
      lockedTabs.forEach((li) => locked.push(li.outerHTML.substring(0, 600)))
      const availabilityInfos = document.querySelectorAll('.availabilityinfo')
      const availTexts: string[] = []
      availabilityInfos.forEach((a) => {
        const t = a.textContent?.trim()
        if (t) availTexts.push(t.substring(0, 300))
      })
      return { infos, locked, availTexts }
    })

    console.warn('\n=== Restriction Info Divs ===')
    for (const info of restrictionDetails.infos) {
      console.warn(`ID: ${info.id}\nText: ${info.text}\n---`)
    }

    const mod3Tab = page.locator('a.nav-link[href*="section=3"]').first()
    await mod3Tab.click({ force: true })
    await page
      .locator('#section-3')
      .waitFor({ state: 'attached', timeout: 10000 })
      .catch(() => {})
    await page
      .locator('#section-3')
      .first()
      .scrollIntoViewIfNeeded()
      .catch(() => {})
    await page.screenshot({
      path: resolve(evidenceDir, '02-mod3-forced-click.png'),
      fullPage: false,
    })

    const afterClick = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.availabilityinfo')).map((a) => ({
        text: a.textContent?.trim()?.substring(0, 300) || '',
        visible: a.checkVisibility(),
        parentClasses: Array.from(a.parentElement?.classList || []),
      }))
    })
    console.warn('\nAvailability after click:')
    for (const a of afterClick) {
      console.warn(`  visible=${a.visible} classes=[${a.parentClasses.join(',')}] text="${a.text}"`)
    }

    const tabNav = page.locator('.nav-tabs, .more-nav, [role="menubar"]').first()
    if (await tabNav.isVisible().catch(() => false)) {
      await tabNav.screenshot({ path: resolve(evidenceDir, '03-tab-bar.png') })
    }

    const bibliotecaBlock = page
      .locator(
        '.card-title:has-text("Biblioteca"), h3:has-text("Biblioteca"), .card-header:has-text("Biblioteca")',
      )
      .first()
    if (await bibliotecaBlock.isVisible().catch(() => false)) {
      await bibliotecaBlock.scrollIntoViewIfNeeded()
      await page.screenshot({ path: resolve(evidenceDir, '05-sidebar-biblioteca.png') })
      const sidebarLinks = await page.evaluate(() => {
        const blocks = Array.from(document.querySelectorAll('.card'))
        for (const block of blocks) {
          const title = block.querySelector('.card-title, h3, .card-header')
          if (title && title.textContent?.includes('Biblioteca')) {
            return Array.from(block.querySelectorAll('a')).map((a) => ({
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
    }

    const pdfUrl =
      'https://campus.aulavirtual.unc.edu.ar/pluginfile.php/293209/mod_resource/content/1/Funcion%20Lambda.pdf'
    console.warn(`\nVerifying PDF exists: ${pdfUrl}`)
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null)
    await page
      .goto(pdfUrl, { waitUntil: 'load', timeout: 15000 })
      .catch(() => console.warn('PDF navigation triggered download (expected)'))
    const download = await downloadPromise
    if (download) {
      console.warn(`PDF download detected: "${download.suggestedFilename()}"`)
    }
    await page.screenshot({ path: resolve(evidenceDir, '06-pdf-triggered.png') })

    await page.goto(`${ctx.env.baseUrl}/course/view.php?id=${courseId}`, { waitUntil: 'load' })
    await page
      .locator('.course-content, .nav-tabs')
      .first()
      .waitFor({ state: 'visible', timeout: 15000 })
      .catch(() => {})
    await page
      .locator('.course-content')
      .first()
      .scrollIntoViewIfNeeded()
      .catch(() => {})
    await page.screenshot({
      path: resolve(evidenceDir, '07-after-pdf-still-locked.png'),
      fullPage: false,
    })

    const mod3StillLocked = await page.evaluate(() => {
      const tabLi = document.querySelector('li.tab_position_3')
      if (!tabLi) return 'NO_TAB_FOUND'
      return tabLi.classList.contains('disabled') ? 'STILL_LOCKED' : 'NOW_UNLOCKED'
    })
    console.warn(`Module 3 status after PDF: ${mod3StillLocked}`)

    console.warn('\n=== Evidence Collection Complete ===')
  })
})
