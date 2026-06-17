#!/usr/bin/env bun
/**
 * Setup doctor — read-only health check for UNC agentic-dev setup.
 *
 * Checks: Bun runtime, .env file, required env vars, opencode.jsonc validity.
 *
 * Usage:
 *   bun run setup:doctor           # human-readable summary
 *   bun run setup:doctor --preflight  # blocker-only gate
 *
 * Exit: 0 = ok, 1 = needs action
 */

import { existsSync } from 'node:fs'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { homedir } from 'node:os'

const REPO_ROOT = process.cwd()
const ENV_PATH = join(REPO_ROOT, '.env')
const ENV_EXAMPLE_PATH = join(REPO_ROOT, '.env.example')
const OPENCODE_PATH = join(REPO_ROOT, 'opencode.jsonc')

const preflight = process.argv.includes('--preflight')

// Required env vars (core)
const REQUIRED_VARS = ['MOODLE_API_URL', 'MOODLE_API_TOKEN']

// Optional but recommended
const OPTIONAL_VARS = [
  'TAVILY_API_KEY',
  'SUPABASE_PROJECT_REF',
  'GUARANI_API_URL',
  'GUARANI_API_TOKEN',
]

function checkBun(): { ok: boolean; version: string } {
  const version = process.versions.bun
  return { ok: Boolean(version), version: version ?? 'unknown' }
}

function parseEnvVars(filePath: string): Set<string> {
  if (!existsSync(filePath)) return new Set()
  const content = readFileSync(filePath, 'utf-8')
  const vars = new Set<string>()
  for (const line of content.split('\n')) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=/)
    if (match) vars.add(match[1])
  }
  return vars
}

function checkEnv(): { exists: boolean; missingRequired: string[]; missingOptional: string[] } {
  if (!existsSync(ENV_PATH)) {
    const exampleVars = parseEnvVars(ENV_EXAMPLE_PATH)
    return {
      exists: false,
      missingRequired: [...exampleVars].filter((v) => REQUIRED_VARS.includes(v)),
      missingOptional: [...exampleVars].filter((v) => OPTIONAL_VARS.includes(v)),
    }
  }
  const envVars = parseEnvVars(ENV_PATH)
  const missingRequired = REQUIRED_VARS.filter((v) => !envVars.has(v))
  const missingOptional = OPTIONAL_VARS.filter((v) => !envVars.has(v))
  return { exists: true, missingRequired, missingOptional }
}

function checkOpenCodeConfig(): boolean {
  return existsSync(OPENCODE_PATH)
}

function main(): void {
  // Preflight: only check Bun (runs before `bun install`)
  if (preflight) {
    const bun = checkBun()
    if (!bun.ok) {
      console.error('ERROR: Bun runtime not detected.')
      process.exit(1)
    }
    console.log(`OK: Bun ${bun.version}`)
    process.exit(0)
  }

  // Full check
  console.log('UNC Agentic Dev — Setup Doctor\n')

  // Bun
  const bun = checkBun()
  console.log(`Bun:        ${bun.ok ? 'OK (v' + bun.version + ')' : 'MISSING'}`)

  // .env
  const env = checkEnv()
  console.log(`.env file:  ${env.exists ? 'OK' : 'MISSING — copy .env.example to .env'}`)
  if (env.missingRequired.length > 0) {
    console.log(`  Missing required vars: ${env.missingRequired.join(', ')}`)
  }
  if (env.missingOptional.length > 0) {
    console.log(`  Missing optional vars: ${env.missingOptional.join(', ')}`)
  }

  // opencode config
  console.log(`opencode:   ${checkOpenCodeConfig() ? 'OK (opencode.jsonc found)' : 'MISSING'}`)

  // dependencies
  const hasNodeModules = existsSync(join(REPO_ROOT, 'node_modules'))
  console.log(`deps:       ${hasNodeModules ? 'OK (installed)' : 'MISSING — run bun install'}`)

  const hasOpenCodeModules = existsSync(join(REPO_ROOT, '.opencode', 'node_modules'))
  console.log(
    `oc-deps:    ${hasOpenCodeModules ? 'OK (installed)' : 'MISSING — run cd .opencode && bun install'}`,
  )

  // Summary
  const ok =
    bun.ok &&
    env.exists &&
    env.missingRequired.length === 0 &&
    checkOpenCodeConfig() &&
    hasNodeModules
  console.log(
    `\nStatus: ${ok ? 'OK — ready for `bun run opencode`' : 'NEEDS ACTION — fix issues above'}`,
  )
  process.exit(ok ? 0 : 1)
}

main()
