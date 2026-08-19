#!/usr/bin/env bun
/**
 * Lightweight variable linter — ensures .env.example and opencode.jsonc
 * are in sync. Scans opencode.jsonc for {env:VAR} references and checks
 * they are declared in .env.example.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = process.cwd();
const ENV_EXAMPLE = join(REPO_ROOT, '.env.example');
const OPENCODE_CONFIG = join(REPO_ROOT, 'opencode.jsonc');

function parseEnvExample(): Set<string> {
  if (!existsSync(ENV_EXAMPLE))
    return new Set();
  const content = readFileSync(ENV_EXAMPLE, 'utf-8');
  const vars = new Set<string>();
  for (const line of content.split('\n')) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=/);
    if (match)
      vars.add(match[1]);
  }
  return vars;
}

function findEnvReferences(): Set<string> {
  if (!existsSync(OPENCODE_CONFIG))
    return new Set();
  const raw = readFileSync(OPENCODE_CONFIG, 'utf-8');
  // Strip JSONC comments so examples in comments don't trigger false positives.
  // Keep `://` intact (URLs) — only strip `//` not preceded by `:`.
  const content = raw
    .replace(/(^|[^:])\/\/.*$/gm, '$1') // single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, ''); // block comments
  const refs = new Set<string>();
  const re = /\{env:([A-Z_][A-Z0-9_]*)\}/g;
  for (let match = re.exec(content); match !== null; match = re.exec(content)) {
    refs.add(match[1]);
  }
  return refs;
}

function main(): void {
  const declared = parseEnvExample();
  const referenced = findEnvReferences();

  // Check: every {env:VAR} in opencode.jsonc must exist in .env.example
  const errors: string[] = [];
  for (const ref of referenced) {
    if (!declared.has(ref)) {
      errors.push(`{env:${ref}} referenced in opencode.jsonc but NOT declared in .env.example`);
    }
  }

  // Output
  console.log('UNC Vars Lint Report');
  console.log('====================\n');
  console.log(`Declared in .env.example: ${declared.size}`);
  console.log(`Referenced in opencode.jsonc: ${referenced.size}`);

  if (errors.length === 0) {
    console.log('\nAll good — no issues found.');
  }
  else {
    console.log(`\nERRORS (${errors.length}):`);
    for (const e of errors) console.log(`  - ${e}`);
  }

  process.exit(errors.length > 0 ? 1 : 0);
}

main();
