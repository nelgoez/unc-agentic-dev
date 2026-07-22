# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\validate-course.kata.ts >> Course Validation — Multi-Role Audit >> Audit course 269 across student/teacher/admin roles
- Location: tests\e2e\validate-course.kata.ts:11:3

# Error details

```
Error: CAS username step failed — no password field: https://autenticar.unc.edu.ar/login
```

# Page snapshot

```yaml
- main [ref=e3]:
    - generic [ref=e8]:
        - img "UNC" [ref=e12]
        - heading "Login" [level=1] [ref=e13]
        - generic [ref=e16]: to Moodle Campus
        - paragraph [ref=e17]: Sign in with your Usuario UNC
        - generic [ref=e18]:
            - generic [ref=e19]:
                - textbox "Usuario UNC" [active] [ref=e20]:
                    - /placeholder: ' '
                - generic: Usuario UNC
            - alert [ref=e21]:
                - generic [ref=e22]: Enter a valid username.
            - button "Next" [ref=e23] [cursor=pointer]
        - generic [ref=e24]:
            - link "Create my Usuario UNC" [ref=e25] [cursor=pointer]:
                - /url: https://usuarios.unc.edu.ar/#/
            - generic [ref=e26]: •
            - link "I forgot my Usuario UNC" [ref=e27] [cursor=pointer]:
                - /url: '#forgotUserModal'
        - generic [ref=e28]: We will never ask you for your password in an email.
```

# Test source

```ts
  1  | import type { Page } from '@playwright/test'
  2  | import { atc } from '../../utils/decorators'
  3  |
  4  | export { atc }
  5  |
  6  | export class MoodleLogin {
  7  |   private page: Page
  8  |   private baseUrl: string
  9  |
  10 |   constructor(page: Page, baseUrl: string) {
  11 |     this.page = page
  12 |     this.baseUrl = baseUrl
  13 |   }
  14 |
  15 |   @atc('ML-1', { story: 'UNC-RE-1', feature: 'Moodle Login' })
  16 |   async loginAs(username: string, password: string): Promise<void> {
  17 |     await this.page.goto(`${this.baseUrl}/login/index.php`)
  18 |     await this.page.waitForLoadState('load')
  19 |
  20 |     const onCasPage = this.page.url().includes('autenticar.unc.edu.ar')
  21 |     const hasCasBtn =
  22 |       !onCasPage &&
  23 |       (await this.page
  24 |         .locator('a:has-text("Usuarios UNC Habilitados")')
  25 |         .first()
  26 |         .isVisible()
  27 |         .catch(() => false))
  28 |
  29 |     if (hasCasBtn || onCasPage) {
  30 |       if (hasCasBtn) {
  31 |         await this.page.locator('a:has-text("Usuarios UNC Habilitados")').first().click()
  32 |         await this.page.waitForLoadState('load')
  33 |       }
  34 |
  35 |       await this.page.locator('#username').waitFor({ state: 'visible', timeout: 15000 })
  36 |       await this.page.evaluate((val) => {
  37 |         const form = document.getElementById('loginForm') as HTMLFormElement
  38 |         if (!form) return
  39 |         const clone = form.cloneNode(true) as HTMLFormElement
  40 |         form.parentNode!.replaceChild(clone, form)
  41 |         ;(clone.querySelector('#username') as HTMLInputElement).value = val
  42 |         HTMLFormElement.prototype.submit.call(clone)
  43 |       }, username)
  44 |       await this.page.waitForLoadState('load')
  45 |       await this.page.screenshot({ path: 'reports/audit/cas-after-submit.png' })
  46 |       const errs = await this.page.evaluate(() => {
  47 |         return Array.from(document.querySelectorAll('.error-message, .alert, [role="alert"]'))
  48 |           .filter((e) => e.textContent?.trim())
  49 |           .map((e) => ({ text: e.textContent?.trim(), visible: e.checkVisibility() }))
  50 |       })
  51 |       console.warn(
  52 |         `CAS page after submit — URL: ${this.page.url()}, errors: ${JSON.stringify(errs)}`,
  53 |       )
  54 |
  55 |       if (this.page.url().includes('autenticar')) {
  56 |         const passField = this.page.locator('input[type="password"]').first()
  57 |         if (await passField.isVisible({ timeout: 5000 }).catch(() => false)) {
  58 |           await passField.fill(password)
  59 |           await this.page.locator('button[type="submit"]').first().click()
  60 |           await this.page.waitForLoadState('load')
  61 |           if (this.page.url().includes('autenticar'))
  62 |             throw new Error(`CAS password failed: ${this.page.url()}`)
  63 |         } else {
> 64 |           throw new Error(`CAS username step failed — no password field: ${this.page.url()}`)
     |                 ^ Error: CAS username step failed — no password field: https://autenticar.unc.edu.ar/login
  65 |         }
  66 |       }
  67 |
  68 |       if (this.page.url().includes('autenticar')) {
  69 |         throw new Error(`CAS login failed for ${username} — still at CAS: ${this.page.url()}`)
  70 |       }
  71 |       return
  72 |     }
  73 |
  74 |     await this.page.locator('#username').waitFor({ state: 'visible', timeout: 15000 })
  75 |     await this.page.locator('#username').fill(username)
  76 |     await this.page.locator('#password').fill(password)
  77 |     await this.page.locator('#loginbtn').click()
  78 |     await this.page.waitForLoadState('load')
  79 |     if (this.page.url().includes('login/index.php')) {
  80 |       throw new Error(`Standard login failed for ${username} — still at login page`)
  81 |     }
  82 |   }
  83 |
  84 |   @atc('ML-2', { story: 'UNC-RE-1', feature: 'Moodle Login' })
  85 |   async loginAsStudent(): Promise<void> {
  86 |     const user = process.env.STUDENT_USERNAME ?? ''
  87 |     const pass = (process.env.STUDENT_PASSWORD ?? '').trim()
  88 |     await this.loginAs(user, pass)
  89 |   }
  90 |
  91 |   @atc('ML-3', { story: 'UNC-RE-1', feature: 'Moodle Login' })
  92 |   async loginAsAdmin(): Promise<void> {
  93 |     const user = (process.env.ADMIN_USERNAME ?? '').trim()
  94 |     const pass = (process.env.ADMIN_PASSWORD ?? '').trim()
  95 |     await this.page.context().clearCookies()
  96 |     await this.loginAs(user, pass)
  97 |   }
  98 | }
  99 |
```
