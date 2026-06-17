export type ActivityType =
  | 'html'
  | 'quiz'
  | 'assignment'
  | 'forum'
  | 'video'
  | 'h5p'
  | 'feedback'
  | 'url'

export type CompletionCriteria =
  | { kind: 'view' }
  | { kind: 'grade_threshold'; minGrade: number }
  | { kind: 'manual' }
  | { kind: 'submission' }

export interface Activity {
  name: string
  order: number
  type: ActivityType
  mandatory: boolean
  gatesToNextModule: boolean
  completionCriteria: CompletionCriteria
  rescueTrigger: boolean
  maintenanceTrigger: boolean
  estimatedTimeMinutes: number
}

export interface Module {
  name: string
  order: number
  activities: Activity[]
}

export interface CursoConfig {
  name: string
  slug: string
  description: string
  modules: Module[]
  reengagement: {
    rescueDelayHours: number
    maintenanceDelayHours: number
  }
}
