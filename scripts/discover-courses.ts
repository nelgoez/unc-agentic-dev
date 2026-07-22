import { resolve } from 'node:path'
import { writeFileSync, mkdirSync } from 'node:fs'
import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: resolve(__dirname, '..', '.env') })

const BASE_URL = process.env.MOODLE_BASE_URL ?? 'https://campus.aulavirtual.unc.edu.ar'
const ADMIN_USER = process.env.ADMIN_USERNAME ?? ''
const ADMIN_PASS = process.env.ADMIN_PASSWORD ?? ''

interface CourseInfo {
  id: number
  name: string
  href?: string
}

const OUTPUT_PATH = resolve(__dirname, '..', 'reports', 'mvp-demo', 'discovered-courses.json')
const PAGE_TIMEOUT = 15000
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

async function tryFetchLogin(): Promise<CourseInfo[]> {
  console.log('[FETCH] Logging in via web form...')

  const cookieJar = new Map<string, string>()

  function setCookiesFromResponse(resp: Response): void {
    const setCookie = resp.headers.get('set-cookie')
    if (setCookie) {
      for (const part of setCookie.split(',')) {
        const match = part.match(/^([^=]+)=([^;]+)/)
        if (match) cookieJar.set(match[1], match[2])
      }
    }
  }

  function getCookieHeader(): string {
    return Array.from(cookieJar.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ')
  }

  const headers: Record<string, string> = {
    'User-Agent': USER_AGENT,
  }

  // Step 1: Get login page to extract logintoken
  console.log('[FETCH] Step 1: Getting login page for CSRF token...')
  const loginPageResp = await fetch(`${BASE_URL}/login/index.php`, {
    headers: { ...headers },
    redirect: 'manual',
  })
  setCookiesFromResponse(loginPageResp)
  const loginHtml = await loginPageResp.text()

  const tokenMatch = loginHtml.match(/<input[^>]*name="logintoken"[^>]*value="([^"]+)"/)
  const logintoken = tokenMatch ? tokenMatch[1] : ''
  if (!logintoken) {
    console.warn('[FETCH] Could not find logintoken in page')
  } else {
    console.log(`[FETCH] Found logintoken: ${logintoken.slice(0, 16)}...`)
  }

  // Step 2: POST login credentials
  console.log('[FETCH] Step 2: Submitting login form...')
  const loginForm = new URLSearchParams()
  loginForm.set('username', ADMIN_USER)
  loginForm.set('password', ADMIN_PASS)
  loginForm.set('logintoken', logintoken)

  const loginResp = await fetch(`${BASE_URL}/login/index.php`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: getCookieHeader(),
    },
    body: loginForm.toString(),
    redirect: 'manual',
  })

  setCookiesFromResponse(loginResp)
  const location = loginResp.headers.get('location') || ''
  console.log(`[FETCH] Login redirect: ${location}`)

  // Moodle login redirects to the original page or dashboard
  const sessionCookie = cookieJar.get('MoodleSession')
  if (!sessionCookie) {
    throw new Error('Login failed — no MoodleSession cookie received')
  }
  console.log(`[FETCH] MoodleSession cookie obtained: ${sessionCookie.slice(0, 16)}...`)

  // Step 3: Follow redirect to establish session
  if (location && !location.includes('login')) {
    const redirectResp = await fetch(
      location.startsWith('http') ? location : `${BASE_URL}${location}`,
      {
        headers: {
          ...headers,
          Cookie: getCookieHeader(),
        },
        redirect: 'manual',
      },
    )
    setCookiesFromResponse(redirectResp)
  }

  // Step 4: Navigate course index
  console.log('[FETCH] Step 3: Fetching course index...')
  const idxResp = await fetch(`${BASE_URL}/course/index.php`, {
    headers: {
      ...headers,
      Cookie: getCookieHeader(),
    },
  })
  const idxHtml = await idxResp.text()
  console.log(`[FETCH] Course index HTML size: ${idxHtml.length} bytes`)

  // Step 5: Extract courses — try multiple patterns
  const courses = new Map<number, CourseInfo>()

  const patterns = [
    /<a[^>]+href="[^"]*course\/view\.php\?id=(\d+)[^"]*"[^>]*>([\s\S]*?)<\/a>/gi,
    /<a[^>]+href="[^"]*\?id=(\d+)[^"]*course[^"]*"[^>]*>([\s\S]*?)<\/a>/gi,
  ]

  for (const pattern of patterns) {
    let match: RegExpExecArray | null
    while ((match = pattern.exec(idxHtml)) !== null) {
      const id = Number.parseInt(match[1], 10)
      const rawName = match[2]
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim()
      if (id > 0 && rawName && !courses.has(id)) {
        courses.set(id, {
          id,
          name: rawName,
          href: `${BASE_URL}/course/view.php?id=${id}`,
        })
      }
    }
  }

  // Step 5b: Try a different URL path — /course/index.php without category grouping sometimes shows all courses differently
  // Also try getting courses via /my/ (dashboard) which often lists enrolled courses
  console.log('[FETCH] Step 4: Also checking dashboard for enrolled courses...')
  try {
    const dashResp = await fetch(`${BASE_URL}/my/`, {
      headers: {
        ...headers,
        Cookie: getCookieHeader(),
      },
    })
    const dashHtml = await dashResp.text()
    const dashPattern = /<a[^>]+href="[^"]*course\/view\.php\?id=(\d+)[^"]*"[^>]*>([\s\S]*?)<\/a>/gi
    let m: RegExpExecArray | null
    while ((m = dashPattern.exec(dashHtml)) !== null) {
      const id = Number.parseInt(m[1], 10)
      const rawName = m[2]
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim()
      if (id > 0 && rawName && !courses.has(id)) {
        courses.set(id, {
          id,
          name: rawName,
          href: `${BASE_URL}/course/view.php?id=${id}`,
        })
      }
    }
  } catch (err) {
    console.warn(`[FETCH] Dashboard scrape failed: ${(err as Error).message}`)
  }

  // Step 6: If still too few, try browsing categories
  if (courses.size < 5) {
    console.log('[FETCH] Step 5: Few courses found, browsing categories...')
    const catPattern = /href="[^"]*\/course\/index\.php\?categoryid=(\d+)[^"]*"/gi
    let cm: RegExpExecArray | null
    const catIds = new Set<number>()
    while ((cm = catPattern.exec(idxHtml)) !== null) {
      catIds.add(Number.parseInt(cm[1], 10))
    }

    for (const catId of catIds) {
      console.log(`[FETCH]  Browsing category ${catId}...`)
      try {
        const catResp = await fetch(`${BASE_URL}/course/index.php?categoryid=${catId}`, {
          headers: { ...headers, Cookie: getCookieHeader() },
        })
        const catHtml = await catResp.text()
        const catPattern =
          /<a[^>]+href="[^"]*course\/view\.php\?id=(\d+)[^"]*"[^>]*>([\s\S]*?)<\/a>/gi
        let cm2: RegExpExecArray | null
        while ((cm2 = catPattern.exec(catHtml)) !== null) {
          const id = Number.parseInt(cm2[1], 10)
          const rawName = cm2[2]
            .replace(/<[^>]*>/g, '')
            .replace(/\s+/g, ' ')
            .trim()
          if (id > 0 && rawName && !courses.has(id)) {
            courses.set(id, {
              id,
              name: rawName,
              href: `${BASE_URL}/course/view.php?id=${id}`,
            })
          }
        }
      } catch {
        // skip categories that fail
      }
    }
  }

  return Array.from(courses.values())
}

async function main(): Promise<void> {
  mkdirSync(resolve(__dirname, '..', 'reports', 'mvp-demo'), { recursive: true })

  let courses: CourseInfo[] = []

  courses = await tryFetchLogin()

  if (courses.length === 0) {
    throw new Error('No courses discovered by any method')
  }

  courses.sort((a, b) => a.id - b.id)

  writeFileSync(OUTPUT_PATH, JSON.stringify(courses, null, 2))

  console.log(`\n=== RESULTS ===`)
  console.log(`Total unique courses: ${courses.length}`)
  console.log(`Saved to: ${OUTPUT_PATH}\n`)

  for (const c of courses) {
    const marker = c.id === 269 ? ' ⬅ COURSE 269' : ''
    console.log(`  ID ${c.id}: "${c.name}"${marker}`)
  }

  const has269 = courses.some((c) => c.id === 269)
  console.log(`\nCourse 269 included: ${has269 ? 'YES' : 'NO'}`)

  if (!has269) {
    console.warn('WARNING: Course 269 not found!')
    process.exitCode = 1
  }
}

main().catch((err) => {
  console.error('FATAL:', err.message)
  process.exit(1)
})
