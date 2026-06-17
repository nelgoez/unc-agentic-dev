#!/usr/bin/env bun
import { resolve } from 'node:path'
import { promptCursoConfig } from './prompts/course'
import { generateCursoKit } from './generator'

async function main() {
  const args = process.argv.slice(2)
  const cursoName = args[0]

  console.log(`
╔══════════════════════════════════════╗
║    UNC Course Kit — v0.1.0          ║
║    Generador de blueprint para cursos║
╚══════════════════════════════════════╝
  `)

  console.log('Te voy a hacer algunas preguntas sobre el curso para armar el kit.\n')

  if (cursoName) {
    console.log(`Curso: ${cursoName}\n`)
  }

  const config = await promptCursoConfig()

  // If name was provided as CLI arg, override the prompted name
  if (cursoName) {
    config.name = cursoName
    config.slug = cursoName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  // Default output: current directory
  const outputDir = resolve(process.cwd(), args[1] ?? '.')

  generateCursoKit(config, outputDir)
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
