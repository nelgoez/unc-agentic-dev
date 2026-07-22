import type { Page } from '@playwright/test'
import { atc } from '../../utils/decorators'
import type { CourseStructure } from './MoodleCourse'

export interface AvailabilityCondition {
  type: 'completion' | 'grade' | 'date' | 'group' | 'profile' | 'unknown'
  cm?: number
  id?: number
  min?: number
  max?: number
  e?: number
  expectedState?: string
}

export interface SectionAvailability {
  sectionNumber: number
  sectionTitle: string
  sectionDbId: number
  rawJson: string | null
  conditions: AvailabilityCondition[]
  operator: string
}

export interface JsonAuditFinding {
  severity: 'critical' | 'warning' | 'info'
  sectionNumber: number
  sectionTitle: string
  message: string
  detail: string
  conditionType: string
  cmid?: number
}

function parseAvailabilityTree(node: any, conditions: AvailabilityCondition[]): void {
  if (!node || typeof node !== 'object') return

  if (node.c && Array.isArray(node.c)) {
    for (const child of node.c) {
      if (child.type === 'completion') {
        conditions.push({
          type: 'completion',
          cm: child.cm,
          e: child.e,
          expectedState:
            child.e === 1
              ? 'COMPLETION_COMPLETE'
              : child.e === 0
                ? 'COMPLETION_INCOMPLETE'
                : `state_${child.e}`,
        })
      } else if (child.type === 'grade') {
        conditions.push({
          type: 'grade',
          id: child.id,
          min: child.min,
          max: child.max,
        })
      } else if (child.type === 'date') {
        conditions.push({ type: 'date' })
      } else if (child.type === 'group') {
        conditions.push({ type: 'group', id: child.id })
      } else {
        conditions.push({ type: 'unknown' })
      }
    }
  }
}

export class MoodleAuditor {
  private page: Page
  private baseUrl: string

  constructor(page: Page, baseUrl: string) {
    this.page = page
    this.baseUrl = baseUrl
  }

  @atc('MA-1', { story: 'UNC-MVP-1', feature: 'Deep Audit' })
  async getSectionDbIds(): Promise<
    Array<{ sectionNumber: number; sectionDbId: number; title: string }>
  > {
    return this.page.evaluate(() => {
      const sections = document.querySelectorAll(
        'li.section.main, #region-main li.section, .course-content li.section',
      )
      return Array.from(sections)
        .map((section) => {
          const idAttr = section.getAttribute('id') || ''
          const sectionMatch = idAttr.match(/section-(\d+)/)
          const sectionNumber = sectionMatch ? Number.parseInt(sectionMatch[1], 10) : 0

          const editLink = section.querySelector(
            'a[href*="editsection"], a[href*="editsection.php"]',
          )
          let sectionDbId = 0
          if (editLink) {
            const href = editLink.getAttribute('href') || ''
            const idMatch = href.match(/[?&]id=(\d+)/)
            if (idMatch) sectionDbId = Number.parseInt(idMatch[1], 10)
          }

          const titleEl = section.querySelector('.sectionname, h3.sectionname, .section-title')
          const title = titleEl?.textContent?.trim() || `Section ${sectionNumber}`

          return { sectionNumber, sectionDbId, title }
        })
        .filter((s) => s.sectionDbId > 0)
    })
  }

  @atc('MA-2', { story: 'UNC-MVP-1', feature: 'Deep Audit' })
  async getSectionAvailabilityJson(sectionDbId: number): Promise<SectionAvailability | null> {
    await this.page.goto(`${this.baseUrl}/course/editsection.php?id=${sectionDbId}`)
    await this.page.waitForLoadState('load')

    const result = await this.page.evaluate((secId) => {
      const jsonInput = document.querySelector<HTMLInputElement>(
        'input[name="availabilityconditionsjson"], textarea[name="availabilityconditionsjson"]',
      )
      const sectionTitle =
        document
          .querySelector('h1, h2, .card-header h3')
          ?.textContent?.trim()
          ?.replace(/^Editing\s+/i, '')
          ?.replace(/^Editando\s+/i, '') || `Section ${secId}`

      const rawJson = jsonInput?.value || null

      return { sectionDbId: secId, sectionTitle, rawJson }
    }, sectionDbId)

    if (!result.rawJson) return null

    const conditions: AvailabilityCondition[] = []
    let operator = '&'
    try {
      const parsed = JSON.parse(result.rawJson)
      operator = parsed.op || '&'
      parseAvailabilityTree(parsed, conditions)
    } catch {
      return null
    }

    return {
      sectionNumber: 0,
      sectionTitle: result.sectionTitle,
      sectionDbId: result.sectionDbId,
      rawJson: result.rawJson,
      conditions,
      operator,
    }
  }

  @atc('MA-3', { story: 'UNC-MVP-1', feature: 'Deep Audit' })
  async analyzeAvailabilityJson(adminView: CourseStructure): Promise<JsonAuditFinding[]> {
    const findings: JsonAuditFinding[] = []

    const sectionIds = await this.getSectionDbIds()
    const allActivities = adminView.sections.flatMap((s) =>
      s.activities.map((a) => ({ ...a, sectionNumber: s.number })),
    )
    const cmidMap = new Map<number, (typeof allActivities)[0]>()
    for (const act of allActivities) {
      const cmidMatch = act.href.match(/id=(\d+)/)
      if (cmidMatch) {
        cmidMap.set(Number.parseInt(cmidMatch[1], 10), act)
      }
    }

    for (const sec of sectionIds) {
      const availability = await this.getSectionAvailabilityJson(sec.sectionDbId)
      if (!availability || availability.conditions.length === 0) continue

      availability.sectionNumber = sec.sectionNumber

      for (const cond of availability.conditions) {
        if (cond.type === 'completion' && cond.cm) {
          const exists = cmidMap.has(cond.cm)
          if (!exists) {
            findings.push({
              severity: 'critical',
              sectionNumber: sec.sectionNumber,
              sectionTitle: sec.title,
              message: `Phantom cmid ${cond.cm} referenced in availability JSON but no matching activity found`,
              detail: `La sección "${sec.title}" tiene una condición de disponibilidad que referencia el course module ID ${cond.cm}. Este cmid no existe en el curso. Es un fantasma confirmado a nivel de datos. Causa: la actividad fue eliminada pero la restricción JSON persiste en la base de datos.`,
              conditionType: 'completion',
              cmid: cond.cm,
            })
          } else {
            const activity = cmidMap.get(cond.cm)!
            if (!activity.hasCompletionTracking) {
              findings.push({
                severity: 'critical',
                sectionNumber: sec.sectionNumber,
                sectionTitle: sec.title,
                message: `Activity "${activity.name}" (cmid ${cond.cm}) referenced as completion condition BUT has no completion tracking enabled`,
                detail: `"${sec.title}" requiere que "${activity.name}" esté completada, pero "${activity.name}" no tiene habilitado el seguimiento de finalización. Moodle nunca podrá marcarla como completada. Solución: habilitar seguimiento de finalización en la configuración de "${activity.name}".`,
                conditionType: 'completion',
                cmid: cond.cm,
              })
            }
          }
        }

        if (cond.type === 'grade' && cond.id) {
          findings.push({
            severity: 'warning',
            sectionNumber: sec.sectionNumber,
            sectionTitle: sec.title,
            message: `Grade condition referencing grade item ID ${cond.id}${cond.min !== undefined ? ` (min: ${cond.min})` : ''}${cond.max !== undefined ? ` (max: ${cond.max})` : ''}`,
            detail: `"${sec.title}" tiene una condición de nota que referencia el grade item ID ${cond.id}. Verificar manualmente que este ítem de calificación exista y tenga datos. Las condiciones de nota pueden generar deadlocks si el ítem de calificación fue eliminado.`,
            conditionType: 'grade',
          })
        }

        if (cond.type === 'date') {
          findings.push({
            severity: 'info',
            sectionNumber: sec.sectionNumber,
            sectionTitle: sec.title,
            message: `Date-based availability condition on "${sec.title}"`,
            detail: `"${sec.title}" tiene una condición de fecha. Verificar que las fechas no estén en el pasado bloqueando permanentemente el contenido.`,
            conditionType: 'date',
          })
        }
      }
    }

    return findings
  }
}
