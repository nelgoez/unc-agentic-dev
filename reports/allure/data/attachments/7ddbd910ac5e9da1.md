# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\validate-course.kata.ts >> Course Validation — Multi-Role Audit >> Audit course 269 across student/teacher/admin roles
- Location: tests\e2e\validate-course.kata.ts:11:3

# Error details

```
Error: CAS username step failed — form submit didn't advance page: https://autenticar.unc.edu.ar/login
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
  1   | import type { Page } from '@playwright/test'
  2   | import { atc } from '../../utils/decorators'
  3   |
  4   | export { atc }
  5   |
  6   | export class MoodleLogin {
  7   |   private page: Page
  8   |   private baseUrl: string
  9   |
  10  |   constructor(page: Page, baseUrl: string) {
  11  |     this.page = page
  12  |     this.baseUrl = baseUrl
  13  |   }
  14  |
  15  |   @atc('ML-1', { story: 'UNC-RE-1', feature: 'Moodle Login' })
  16  |   async loginAs(username: string, password: string): Promise<void> {
  17  |     await this.page.goto(`${this.baseUrl}/login/index.php`)
  18  |     await this.page.waitForLoadState('load')
  19  |
  20  |     const onCasPage = this.page.url().includes('autenticar.unc.edu.ar')
  21  |     const hasCasBtn =
  22  |       !onCasPage &&
  23  |       (await this.page
  24  |         .locator('a:has-text("Usuarios UNC Habilitados")')
  25  |         .first()
  26  |         .isVisible()
  27  |         .catch(() => false))
  28  |
  29  |     if (hasCasBtn || onCasPage) {
  30  |       if (hasCasBtn) {
  31  |         await this.page.locator('a:has-text("Usuarios UNC Habilitados")').first().click()
  32  |         await this.page.waitForLoadState('load')
  33  |       }
  34  |
  35  |       await this.page.locator('#username').waitFor({ state: 'visible', timeout: 15000 })
  36  |       await this.page.evaluate((val) => {
  37  |         const el = document.getElementById('username') as HTMLInputElement
  38  |         if (!el) return
  39  |         el.value = val
  40  |       }, username)
  41  |       await this.page.evaluate((val) => {
  42  |         const el = document.getElementById('username') as HTMLInputElement
  43  |         if (!el) return
  44  |         el.value = val
  45  |       }, username)
  46  |       await this.page.evaluate(() => {
  47  |         const form = document.getElementById('loginForm') as HTMLFormElement
  48  |         if (form) form.submit()
  49  |       })
  50  |       await this.page
  51  |         .waitForURL((url) => !url.href.includes('autenticar.unc.edu.ar'), { timeout: 30000 })
  52  |         .catch(() => {})
  53  |       const afterUrl = this.page.url()
  54  |       console.warn(`CAS after username: ${afterUrl}`)
  55  |
  56  |       if (afterUrl.includes('autenticar')) {
  57  |         const passField = this.page
  58  |           .locator('input[type="password"], input[name="password"]')
  59  |           .first()
  60  |         if (await passField.isVisible({ timeout: 5000 }).catch(() => false)) {
  61  |           await passField.fill(password)
  62  |           await this.page.locator('button[type="submit"], input[type="submit"]').first().click()
  63  |           await this.page
  64  |             .waitForURL((url) => !url.href.includes('autenticar.unc.edu.ar'), { timeout: 30000 })
  65  |             .catch(() => {})
  66  |           if (this.page.url().includes('autenticar')) {
  67  |             throw new Error(`CAS password step failed — still at: ${this.page.url()}`)
  68  |           }
  69  |         } else {
  70  |           await this.page.screenshot({ path: 'reports/audit/cas-state.png' })
> 71  |           throw new Error(
      |                 ^ Error: CAS username step failed — form submit didn't advance page: https://autenticar.unc.edu.ar/login
  72  |             `CAS username step failed — form submit didn't advance page: ${this.page.url()}`,
  73  |           )
  74  |         }
  75  |       }
  76  |
  77  |       if (this.page.url().includes('autenticar')) {
  78  |         throw new Error(`CAS login failed for ${username} — still at CAS: ${this.page.url()}`)
  79  |       }
  80  |       return
  81  |     }
  82  |
  83  |     await this.page.locator('#username').waitFor({ state: 'visible', timeout: 15000 })
  84  |     await this.page.locator('#username').fill(username)
  85  |     await this.page.locator('#password').fill(password)
  86  |     await this.page.locator('#loginbtn').click()
  87  |     await this.page.waitForLoadState('load')
  88  |     if (this.page.url().includes('login/index.php')) {
  89  |       throw new Error(`Standard login failed for ${username} — still at login page`)
  90  |     }
  91  |   }
  92  |
  93  |   @atc('ML-2', { story: 'UNC-RE-1', feature: 'Moodle Login' })
  94  |   async loginAsStudent(): Promise<void> {
  95  |     const user = process.env.STUDENT_USERNAME ?? ''
  96  |     const pass = (process.env.STUDENT_PASSWORD ?? '').trim()
  97  |     await this.loginAs(user, pass)
  98  |   }
  99  |
  100 |   @atc('ML-3', { story: 'UNC-RE-1', feature: 'Moodle Login' })
  101 |   async loginAsAdmin(): Promise<void> {
  102 |     const user = (process.env.ADMIN_USERNAME ?? '').trim()
  103 |     const pass = (process.env.ADMIN_PASSWORD ?? '').trim()
  104 |     await this.page.context().clearCookies()
  105 |     await this.loginAs(user, pass)
  106 |   }
  107 | }
  108 |
```
