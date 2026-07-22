import { atc } from '../../utils/decorators'

export interface MoodleSection {
  id: number
  section: number
  name: string
  visible: number
  summary: string
  summaryformat: number
  sectionurl?: string
  availability?: string | null
  modules: MoodleModule[]
}

export interface MoodleModule {
  id: number
  url?: string
  name: string
  instance: number
  contextid: number
  modplural: string
  modicon: string
  indent: number
  onclick: string
  afterlink: string | null
  customdata?: string
  noviewlink: boolean
  completion: number
  completiondata?: CompletionData
  dates: Array<{ timestamp: number; dataid: number }>
  contents: Array<{
    type: string
    filename: string
    filepath: string
    filesize: number
    fileurl: string
  }>
  description: string
  visible: number
  uservisible: boolean
  availabilityinfo: string | null
  availablefrom: number
  availableuntil: number
  showavailability: number
  availability?: string
  groupmode: number
  groupingid: number
}

export interface CompletionData {
  state: number
  timecompleted: number
  overrideby: number | null
  valueused: boolean
  hascompletion: boolean
  isautomatic: boolean
  istrackeduser: boolean
  uservisible: boolean
}

export interface ActivityCompletionStatus {
  cmid: number
  modname: string
  instance: number
  state: number
  timecompleted: number
  tracking: number
  overrideby: number | null
  valueused: boolean
}

export interface CourseUser {
  id: number
  username: string
  email: string
  firstname: string
  lastname: string
  fullname: string
}

export interface CompletionStatusResponse {
  statuses: ActivityCompletionStatus[]
  warnings?: unknown[]
}

export interface EnrolledUser {
  id: number
  username: string
  fullname: string
  roles: Array<{ roleid: number; name: string; shortname: string }>
}

export interface GradeItem {
  id: number
  itemname: string
  category: string
  grademax: number
  grademin: number
}

export interface CohortSearchResult {
  cohorts: Array<{ id: number; name: string; idnumber: string; visible: boolean }>
}

export class MoodleApiClient {
  private baseUrl: string
  private token: string

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '')
    this.token = token
  }

  private async call<T>(functionName: string, params: Record<string, unknown> = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}/webservice/rest/server.php`)
    url.searchParams.set('wstoken', this.token)
    url.searchParams.set('wsfunction', functionName)
    url.searchParams.set('moodlewsrestformat', 'json')

    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue
      if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
          const item = value[i]
          if (typeof item === 'object' && item !== null) {
            for (const [subKey, subVal] of Object.entries(item)) {
              url.searchParams.append(`${key}[${i}][${subKey}]`, String(subVal))
            }
          } else {
            url.searchParams.append(`${key}[${i}]`, String(item))
          }
        }
      } else if (typeof value === 'object') {
        for (const [subKey, subVal] of Object.entries(value as Record<string, unknown>)) {
          url.searchParams.append(`${key}[${subKey}]`, String(subVal))
        }
      } else {
        url.searchParams.set(key, String(value))
      }
    }

    const resp = await fetch(url.toString())

    if (!resp.ok) {
      throw new Error(`Moodle API error: ${resp.status} ${resp.statusText} for ${functionName}`)
    }

    const data = await resp.json()
    if (data && typeof data === 'object' && 'exception' in data) {
      throw new Error(`Moodle WS error [${data.errorcode}]: ${data.message}`)
    }

    return data as T
  }

  @atc('MAC-1', { story: 'UNC-MVP-1', feature: 'REST API' })
  async getCourseContents(courseId: number | string): Promise<MoodleSection[]> {
    return this.call<MoodleSection[]>('core_course_get_contents', { courseid: Number(courseId) })
  }

  @atc('MAC-2', { story: 'UNC-MVP-1', feature: 'REST API' })
  async getUsersByField(
    field: 'id' | 'username' | 'email',
    values: (string | number)[],
  ): Promise<CourseUser[]> {
    return this.call<CourseUser[]>('core_user_get_users_by_field', { field, values })
  }

  @atc('MAC-3', { story: 'UNC-MVP-1', feature: 'REST API' })
  async getActivitiesCompletionStatus(
    courseId: number | string,
    userId: number,
  ): Promise<ActivityCompletionStatus[]> {
    const resp = await this.call<CompletionStatusResponse>(
      'core_completion_get_activities_completion_status',
      { courseid: Number(courseId), userid: userId },
    )
    return resp.statuses
  }

  @atc('MAC-4', { story: 'UNC-MVP-1', feature: 'REST API' })
  async markActivityComplete(
    courseId: number | string,
    cmId: number,
    userId: number,
  ): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>(
      'core_completion_override_activity_completion_status',
      {
        cmid: cmId,
        userid: userId,
        newstate: 1,
      },
    )
  }

  @atc('MAC-5', { story: 'UNC-MVP-1', feature: 'User Management' })
  async createUser(
    username: string,
    password: string,
    firstname: string,
    lastname: string,
    email: string,
  ): Promise<{ id: number }> {
    const users = await this.call<Array<{ id: number }>>('core_user_create_users', {
      users: [
        {
          username,
          password,
          firstname,
          lastname,
          email,
          auth: 'manual',
        },
      ],
    })
    return users[0]
  }

  @atc('MAC-6', { story: 'UNC-MVP-1', feature: 'User Management' })
  async deleteUsers(userIds: number[]): Promise<void> {
    await this.call<Record<string, unknown>>('core_user_delete_users', { userids: userIds })
  }

  @atc('MAC-7', { story: 'UNC-MVP-1', feature: 'Deep Audit' })
  async findOrphanedCmIds(
    courseContents: MoodleSection[],
  ): Promise<
    Array<{ cmid: number; sectionName: string; moduleName?: string; conditionType: string }>
  > {
    const existingCmIds = new Set<number>()
    const moduleMap = new Map<number, { name: string; sectionName: string }>()

    for (const section of courseContents) {
      for (const mod of section.modules) {
        existingCmIds.add(mod.id)
        moduleMap.set(mod.id, { name: mod.name, sectionName: section.name })
      }
    }

    const orphans: Array<{
      cmid: number
      sectionName: string
      moduleName?: string
      conditionType: string
    }> = []

    for (const section of courseContents) {
      if (!section.modules) continue

      for (const mod of section.modules) {
        if (!mod.availability) continue

        try {
          const tree = JSON.parse(mod.availability)
          this.traverseAvailabilityTree(tree, (cond) => {
            if (cond.type === 'completion' && cond.cm) {
              if (!existingCmIds.has(cond.cm)) {
                const source = moduleMap.get(mod.id)
                orphans.push({
                  cmid: cond.cm,
                  sectionName: section.name,
                  moduleName: source?.name || mod.name,
                  conditionType: 'completion',
                })
              }
            }
          })
        } catch {}
      }

      if (section.availability) {
        try {
          const tree = JSON.parse(section.availability)
          this.traverseAvailabilityTree(tree, (cond) => {
            if (cond.type === 'completion' && cond.cm) {
              if (!existingCmIds.has(cond.cm)) {
                orphans.push({
                  cmid: cond.cm,
                  sectionName: section.name,
                  conditionType: 'completion',
                })
              }
            }
          })
        } catch {}
      }
    }

    return orphans
  }

  private traverseAvailabilityTree(
    node: any,
    callback: (cond: {
      type: string
      cm?: number
      id?: number
      min?: number
      max?: number
    }) => void,
  ): void {
    if (!node || typeof node !== 'object') return
    if (node.type && typeof node.type === 'string') {
      callback(node)
    }
    if (node.c && Array.isArray(node.c)) {
      for (const child of node.c) {
        this.traverseAvailabilityTree(child, callback)
      }
    }
  }

  @atc('MAC-8', { story: 'UNC-MVP-1', feature: 'DB Probes' })
  async getEnrolledUsers(courseId: number): Promise<EnrolledUser[] | null> {
    try {
      const result = await this.call<EnrolledUser[] | { exception: string }>(
        'core_enrol_get_enrolled_users',
        { courseid: courseId },
      )
      if (!result || (Array.isArray(result) && result.length === 0)) return null
      if (!Array.isArray(result)) return null
      return result as EnrolledUser[]
    } catch (err) {
      console.warn('⚠️ getEnrolledUsers failed:', err instanceof Error ? err.message : err)
      return null
    }
  }

  @atc('MAC-9', { story: 'UNC-MVP-1', feature: 'DB Probes' })
  async getGradeItems(courseId: number): Promise<GradeItem[] | null> {
    try {
      const result = await this.call<{ gradeItems: GradeItem[]; warnings?: unknown[] }>(
        'core_grades_get_gradeitems',
        { courseid: courseId },
      )
      if (!result || !result.gradeItems || result.gradeItems.length === 0) return null
      return result.gradeItems
    } catch (err) {
      console.warn('⚠️ getGradeItems failed:', err instanceof Error ? err.message : err)
      return null
    }
  }

  @atc('MAC-10', { story: 'UNC-MVP-1', feature: 'DB Probes' })
  async searchCohorts(query: string, contextId: number): Promise<CohortSearchResult | null> {
    try {
      const result = await this.call<CohortSearchResult | { exception: string }>(
        'core_cohort_search_cohorts',
        { query, context: { contextid: contextId }, includes: 'parents', limitnum: 100 },
      )
      if (!result || (typeof result === 'object' && 'exception' in result)) return null
      const cr = result as CohortSearchResult
      if (!cr.cohorts) return { cohorts: [] }
      return cr
    } catch (err) {
      console.warn('⚠️ searchCohorts failed:', err instanceof Error ? err.message : err)
      return null
    }
  }

  @atc('MAC-11', { story: 'UNC-RE-1', feature: 'Enrolment' })
  async getCourseEnrolMethods(
    courseId: number,
  ): Promise<Array<{ id: number; type: string; name: string }>> {
    return this.call<Array<{ id: number; type: string; name: string }>>(
      'core_enrol_get_course_enrolment_methods',
      { courseid: courseId },
    )
  }

  @atc('MAC-12', { story: 'UNC-RE-1', feature: 'Enrolment' })
  async submitUserEnrolmentForm(formdata: string): Promise<{ result: boolean; error?: string }> {
    const result = await this.call<{ result: boolean; error?: string }>(
      'core_enrol_submit_user_enrolment_form',
      { formdata },
    )
    if (result && result.error) {
      throw new Error(`Moodle enrolment error: ${result.error}`)
    }
    return result
  }

  @atc('MAC-7', { story: 'UNC-MVP-1', feature: 'Deep Audit' })
  async getAvailabilityJsonBreakdown(courseId: number | string): Promise<{
    sections: Array<{
      section: number
      name: string
      moduleCount: number
      hasSectionRestriction: boolean
      modulesWithRestrictions: Array<{
        id: number
        name: string
        conditions: Array<{ type: string; cm?: number; id?: number; min?: number; max?: number }>
      }>
      modules: Array<{
        id: number
        name: string
        completion: number
        completiondata: CompletionData | null
      }>
    }>
    totalActivities: number
    restrictedActivities: number
  }> {
    const contents = await this.getCourseContents(courseId)

    const breakdown = contents.map((section) => {
      const hasSectionRestriction = !!(section.availability && section.availability !== 'null')

      const modulesWithRestrictions = section.modules
        .filter((mod) => mod.availability && mod.availability !== 'null')
        .map((mod) => {
          const conditions: Array<{
            type: string
            cm?: number
            id?: number
            min?: number
            max?: number
          }> = []
          try {
            const tree = JSON.parse(mod.availability!)
            this.traverseAvailabilityTree(tree, (c) => conditions.push(c))
          } catch {}
          return { id: mod.id, name: mod.name, conditions }
        })

      return {
        section: section.section,
        name: section.name,
        moduleCount: section.modules.length,
        hasSectionRestriction,
        modulesWithRestrictions,
        modules: section.modules.map((mod) => ({
          id: mod.id,
          name: mod.name,
          completion: mod.completion,
          completiondata: mod.completiondata ?? null,
        })),
      }
    })

    const totalActivities = breakdown.reduce((s, b) => s + b.moduleCount, 0)
    const restrictedActivities = breakdown.reduce((s, b) => s + b.modulesWithRestrictions.length, 0)

    return { sections: breakdown, totalActivities, restrictedActivities }
  }
}
