#!/usr/bin/env bun
/**
 * Lightweight variable linter — ensures .env.example and opencode.jsonc
 * are in sync. Scans opencode.jsonc for {env:VAR} references and checks
 * they are declared in .env.example.
 */

import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const REPO_ROOT = process.cwd()
const ENV_EXAMPLE = join(REPO_ROOT, '.env.example')
const OPENCODE_CONFIG = join(REPO_ROOT, 'opencode.jsonc')

interface Result {
  errors: string[]
  warnings: string[]
  declared: Set<string>
  referenced: Set<string>
}

function parseEnvExample(): Set<string> {
  if (!existsSync(ENV_EXAMPLE)) return new Set()
  const content = readFileSync(ENV_EXAMPLE, 'utf-8')
  const vars = new Set<string>()
  for (const line of content.split('\n')) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=/)
    if (match) vars.add(match[1])
  }
  return vars
}

function findEnvReferences(): Set<string> {
  if (!existsSync(OPENCODE_CONFIG)) return new Set()
  const raw = readFileSync(OPENCODE_CONFIG, 'utf-8')
  // Strip JSONC comments so examples in comments don't trigger false positives
  const content = raw
    .replace(/\/\/.*$/gm, '') // single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // block comments
  const refs = new Set<string>()
  const re = /\{env:([A-Z_][A-Z0-9_]*)\}/g
  let match
  while ((match = re.exec(content)) !== null) {
    refs.add(match[1])
  }
  return refs
}

function main(): void {
  const result: Result = { errors: [], warnings: [], declared: new Set(), referenced: new Set() }

  result.declared = parseEnvExample()
  result.referenced = findEnvReferences()

  // Check: every {env:VAR} in opencode.jsonc must exist in .env.example
  for (const ref of result.referenced) {
    if (!result.declared.has(ref)) {
      result.errors.push(
        `{env:${ref}} referenced in opencode.jsonc but NOT declared in .env.example`,
      )
    }
  }

  // Check: vars in .env.example without references (warn only)
  for (const dec of result.declared) {
    if (!result.referenced.has(dec)) {
      result.warnings.push(
        `${dec} declared in .env.example but never referenced via {env:${dec}} in opencode.jsonc`,
      )
    }
  }

  // Output
  console.log('UNC Vars Lint Report')
  console.log('====================\n')
  console.log(`Declared in .env.example: ${result.declared.size}`)
  console.log(`Referenced in opencode.jsonc: ${result.referenced.size}`)

  if (result.errors.length === 0 && result.warnings.length === 0) {
    console.log('\nAll good — no issues found.')
  } else {
    if (result.errors.length > 0) {
      console.log(`\nERRORS (${result.errors.length}):`)
      for (const e of result.errors) console.log(`  - ${e}`)
    }
    if (result.warnings.length > 0) {
      console.log(`\nWARNINGS (${result.warnings.length}):`)
      for (const w of result.warnings) console.log(`  - ${w}`)
    }
  }

  process.exit(result.errors.length > 0 ? 1 : 0)
}

main()
