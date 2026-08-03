import type { MoodleSection } from '../../tests/components/api/MoodleApiClient'
import type { Reconciliation } from '../reconcile/reconcileDocsToProd'
import { COMPLETION_STATE_LABELS } from '../reconcile/reconcileDocsToProd'

export interface GateCondition {
  type: string
  cm?: number
  id?: number
  min?: number
  max?: number
  e?: number
}

export interface OrphanInfo {
  cmid: number
  sectionName: string
  moduleName?: string
  conditionType: string
}

interface BreakdownResult {
  sections: Array<{
    section: number
    name: string
    moduleCount: number
    hasSectionRestriction: boolean
    sectionConditions: GateCondition[]
    modulesWithRestrictions: Array<{
      id: number
      name: string
      conditions: GateCondition[]
    }>
    modules: Array<{
      id: number
      name: string
      completion: number
    }>
  }>
  totalActivities: number
  restrictedActivities: number
}

interface ModuleInfo {
  id: number
  name: string
  type: string
}

interface GateFound {
  module: string
  description: string
}

interface CertInfo {
  name: string
  description: string
}

export interface AuditData {
  courseId: number
  courseName: string
  timestamp: string
  badge: string
  criticalCount: number
  warningCount: number
  infoCount: number
  docsConfidence: string
  sections: number
  totalActivities: number
  restrictedActivities: number
  completionAuto: number
  completionManual: number
  completionNone: number
  docTotal: number
  docMatched: number
  hasDocs: boolean
  breakdown: BreakdownResult
  allModules: Map<number, ModuleInfo>
  gatesFound: GateFound[]
  certModules: CertInfo[]
  orphans: OrphanInfo[]
  gatesWithE0orE3: string[]
  reconciliation: Reconciliation
}

export function buildAuditData(
  courseId: number,
  courseName: string,
  sections: MoodleSection[],
  breakdown: BreakdownResult,
  reconciliation: Reconciliation,
  orphans: OrphanInfo[],
  hasDocs: boolean,
): AuditData {
  const now = new Date().toISOString().replace(/T/, ' ').slice(0, 16)

  const allModules = new Map<number, ModuleInfo>()
  for (const s of sections) {
    for (const m of s.modules) {
      allModules.set(m.id, { id: m.id, name: m.name, type: m.modplural })
    }
  }

  let criticalCount = 0
  let warningCount = 0

  if (orphans.length > 0) criticalCount += orphans.length

  const completionAuto = sections.reduce(
    (s, sec) => s + sec.modules.filter((m) => m.completion === 2).length,
    0,
  )
  const completionManual = sections.reduce(
    (s, sec) => s + sec.modules.filter((m) => m.completion === 1).length,
    0,
  )
  const completionNone = sections.reduce(
    (s, sec) => s + sec.modules.filter((m) => m.completion === 0).length,
    0,
  )

  const gatesWithE0orE3: string[] = []
  for (const s of breakdown.sections) {
    for (const mr of s.modulesWithRestrictions) {
      for (const c of mr.conditions) {
        if (c.e !== undefined && (c.e === 0 || c.e === 3)) {
          gatesWithE0orE3.push(`${mr.name}: ${COMPLETION_STATE_LABELS[c.e] ?? c.e}`)
        }
      }
    }
  }
  if (gatesWithE0orE3.length > 0) warningCount += gatesWithE0orE3.length

  const gatesFound: GateFound[] = []
  for (const s of breakdown.sections) {
    for (const mr of s.modulesWithRestrictions) {
      if (mr.conditions.length > 0) {
        const desc = mr.conditions
          .map((c) => {
            if (c.type === 'completion' && c.cm) {
              const mod = allModules.get(c.cm)
              const name = mod?.name || `cmid ${c.cm}`
              const state = c.e !== undefined ? (COMPLETION_STATE_LABELS[c.e] ?? `e=${c.e}`) : ''
              return state ? `"${name}" (${state})` : `"${name}"`
            }
            if (c.type === 'grade' && c.id) return `nota item ${c.id} ≥ ${c.min ?? 0}`
            return `condición tipo ${c.type}`
          })
          .join(' + ')
        gatesFound.push({ module: mr.name, description: desc })
      }
    }
  }

  const certModules: CertInfo[] = []
  for (const s of sections) {
    for (const m of s.modules) {
      if (m.modplural.toLowerCase().includes('certif') || m.name.toLowerCase().includes('certif')) {
        if (m.availability) {
          try {
            const tree = JSON.parse(m.availability)
            const conds = collectConditions(tree)
            const desc = conds
              .map((c) => {
                if (c.type === 'completion' && c.cm) {
                  const mod = allModules.get(c.cm)
                  const name = mod?.name || `cmid ${c.cm}`
                  const state =
                    c.e !== undefined ? `(${COMPLETION_STATE_LABELS[c.e] ?? `e=${c.e}`})` : ''
                  return `"${name}" ${state}`
                }
                if (c.type === 'grade' && c.id) return `nota item ${c.id} ≥ ${c.min ?? 0}`
                return c.type
              })
              .join(', ')
            certModules.push({ name: m.name, description: desc })
          } catch {
            certModules.push({ name: m.name, description: 'Condiciones no parseables' })
          }
        }
      }
    }
  }

  const docTotal = reconciliation.matched.length + reconciliation.docOnly.length
  const docMatched = reconciliation.matched.length
  const badge = criticalCount > 0 ? 'CRÍTICO' : warningCount > 0 ? '⚠️ ADVERTENCIAS' : '✅ OK'
  const docsConfidence = hasDocs ? 'media' : 'baja (sin docs)'

  return {
    courseId,
    courseName,
    timestamp: now,
    badge,
    criticalCount,
    warningCount,
    infoCount: 0,
    docsConfidence,
    sections: sections.length,
    totalActivities: breakdown.totalActivities,
    restrictedActivities: breakdown.restrictedActivities,
    completionAuto,
    completionManual,
    completionNone,
    docTotal,
    docMatched,
    hasDocs,
    breakdown,
    allModules,
    gatesFound,
    certModules,
    orphans,
    gatesWithE0orE3,
    reconciliation,
  }
}

function collectConditions(node: any): GateCondition[] {
  const result: GateCondition[] = []
  if (!node || typeof node !== 'object') return result
  if (node.type && typeof node.type === 'string') {
    result.push({
      type: node.type,
      cm: node.cm,
      id: node.id,
      min: node.min,
      max: node.max,
      e: node.e,
    })
  }
  if (node.c && Array.isArray(node.c)) {
    for (const child of node.c) result.push(...collectConditions(child))
  }
  return result
}
