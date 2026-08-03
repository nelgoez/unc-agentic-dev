#!/usr/bin/env bun
/**
 * audit:curso — API audit for any Moodle course with optional doc reconciliation.
 *
 * Usage:
 *   bun cli/audit-curso.ts <courseId>                    # API-only audit
 *   bun cli/audit-curso.ts <courseId> <docsDir>          # API + doc reconciliation
 *   bun run audit:curso <courseId> <docsDir>
 *
 * Env vars required: MOODLE_BASE_URL, MOODLE_WS_TOKEN
 *
 * Exit: 0 = report generated, 1 = error
 */

import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { parsePreMontaje } from '../scripts/parsers/parsePreMontaje'
import { parseValidacion } from '../scripts/parsers/parseValidacion'
import { reconcileDocsToProd } from '../scripts/reconcile/reconcileDocsToProd'
import { buildAuditData } from '../scripts/report/buildAuditData'
import { generateAuditMd } from '../scripts/report/generateAuditMd'
import { generateAuditHtml } from '../scripts/report/generateAuditHtml'
import { saveReport } from '../scripts/store/saveReport'
import { MoodleApiClient } from '../tests/components/api/MoodleApiClient'

function findFile(
  dir: string,
  patterns: Array<{ pattern: string; extension?: string }>,
): string | null {
  if (!existsSync(dir)) return null
  const entries = readdirSync(dir)
  for (const { pattern, extension } of patterns) {
    for (const entry of entries) {
      const lower = entry.toLowerCase()
      if (lower.includes(pattern.toLowerCase())) {
        if (!extension || lower.endsWith(extension)) {
          return join(dir, entry)
        }
      }
    }
  }
  return null
}

function findCsv(file: string | null, dir: string): string | null {
  if (file) return file
  return findFile(dir, [
    { pattern: 'validacion', extension: '.csv' },
    { pattern: 'validación', extension: '.csv' },
    { pattern: 'hoja 1.csv' },
  ])
}

function findMd(file: string | null, dir: string): string | null {
  if (file) return file
  return findFile(dir, [
    { pattern: 'pre-montaje', extension: '.md' },
    { pattern: 'pre montaje', extension: '.md' },
  ])
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log('Usage: bun cli/audit-curso.ts <courseId> [docsDir]')
    console.log('  courseId  Moodle course ID (required)')
    console.log('  docsDir   Directory with pre-montaje.md and validacion.csv (optional)')
    process.exit(0)
  }

  const courseId = Number(args[0])
  if (Number.isNaN(courseId) || courseId <= 0) {
    console.error(`ERROR: Invalid courseId: ${args[0]}`)
    process.exit(1)
  }

  const docsDir = args[1] || null

  const baseUrl = process.env.MOODLE_BASE_URL
  const token = process.env.MOODLE_WS_TOKEN

  if (!baseUrl || !token) {
    console.error('ERROR: MOODLE_BASE_URL and MOODLE_WS_TOKEN must be set in .env')
    console.error('  Run: bun run opencode (loads .env automatically)')
    process.exit(1)
  }

  console.log(`Auditando curso ${courseId}...`)

  const client = new MoodleApiClient(baseUrl, token)

  const sections = await client.getCourseContents(courseId)
  const breakdown = await client.getAvailabilityJsonBreakdown(courseId)
  const orphans = await client.findOrphanedCmIds(sections)

  const totalActivities = breakdown.totalActivities
  const courseName = sections[0]?.name || sections[0]?.modules[0]?.name || `Curso ${courseId}`

  let hasDocs = false
  let reconciliation: ReturnType<typeof reconcileDocsToProd> = {
    matched: [],
    docOnly: [],
    prodOnly: [],
  }

  if (docsDir) {
    const validacionPath = findCsv(null, docsDir)
    const preMontajePath = findMd(null, docsDir)

    if (validacionPath || preMontajePath) {
      hasDocs = true
      console.log(
        `  Docs encontrados:${validacionPath ? ` validacion=${validacionPath}` : ''}${preMontajePath ? ` pre-montaje=${preMontajePath}` : ''}`,
      )

      const validacionModules = validacionPath ? parseValidacion(validacionPath) : []
      const preMontajeModules = preMontajePath ? parsePreMontaje(preMontajePath) : []

      if (validacionModules.length > 0) {
        console.log(
          `  Validación: ${validacionModules.length} módulos, ${validacionModules.reduce((s, m) => s + m.activities.length, 0)} actividades`,
        )
      }
      if (preMontajeModules.length > 0) {
        console.log(
          `  Pre-montaje: ${preMontajeModules.length} módulos, ${preMontajeModules.reduce((s, m) => s + m.activities.length, 0)} actividades`,
        )
      }

      reconciliation = reconcileDocsToProd(sections, validacionModules, preMontajeModules)
    } else {
      console.log('  Sin docs de validación/pre-montaje encontrados. Reporte API-only.')
    }
  }

  const data = buildAuditData(
    courseId,
    courseName,
    sections,
    breakdown,
    reconciliation,
    orphans,
    hasDocs,
  )
  const markdown = generateAuditMd(data)
  const html = generateAuditHtml(data)

  const output = saveReport(courseId, courseName, markdown, html, {
    sections: breakdown.sections.length,
    activities: totalActivities,
    critical: data.criticalCount,
    warnings: data.warningCount,
    info: data.infoCount,
  })

  console.log(`\nReporte guardado:`)
  console.log(`  HTML: ${output.htmlPath}  (abrir en navegador)`)
  console.log(`  MD:   ${output.mdPath}`)
  console.log(`  Secciones: ${breakdown.sections.length} | Actividades: ${totalActivities}`)
  console.log(`  Huérfanos: ${orphans.length} | Gates con e=0/3: ${data.warningCount}`)
  console.log(`  Confianza docs: ${hasDocs ? 'media' : 'baja (sin docs)'}`)

  process.exit(0)
}

main().catch((err) => {
  console.error('ERROR:', err instanceof Error ? err.message : err)
  process.exit(1)
})
