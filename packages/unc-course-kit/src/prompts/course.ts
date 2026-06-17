import { input, number, select, confirm, checkbox } from '@inquirer/prompts'
import type {
  CursoConfig,
  Module,
  Activity,
  ActivityType,
  CompletionCriteria,
} from '../schema/curso'

const ACTIVITY_TYPES: { value: ActivityType; name: string }[] = [
  { value: 'html', name: 'Página HTML (contenido textual)' },
  { value: 'quiz', name: 'Cuestionario (autocorregido)' },
  { value: 'assignment', name: 'Tarea (entrega de archivo)' },
  { value: 'forum', name: 'Foro (discusión)' },
  { value: 'video', name: 'Video (embebido/enlace)' },
  { value: 'h5p', name: 'H5P (interactivo)' },
  { value: 'feedback', name: 'Encuesta/Feedback' },
  { value: 'url', name: 'Enlace externo' },
]

export async function promptCursoConfig(): Promise<CursoConfig> {
  const name = await input({
    message: 'Nombre del curso:',
    default: 'Mi Curso',
    validate: (v: string) => (v.trim().length > 0 ? true : 'El nombre es obligatorio'),
  })

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  const description = await input({
    message: 'Descripción breve del curso:',
    default: '',
  })

  const moduleCount = await number({
    message: '¿Cuántos módulos tiene el curso?',
    default: 4,
    min: 1,
    max: 20,
  })

  const rescueDelay = await number({
    message: '¿Horas de inactividad antes de enviar email de rescate?',
    default: 72,
    min: 1,
  })

  const maintenanceDelay = await number({
    message: '¿Horas de inactividad para email de mantenimiento?',
    default: 168,
    min: 1,
  })

  const modules: Module[] = []
  for (let m = 1; m <= (moduleCount ?? 4); m++) {
    const moduleName = await input({
      message: `Nombre del Módulo ${m}:`,
      default: `Módulo ${m}`,
    })

    const activityCount = await number({
      message: `¿Cuántas actividades en ${moduleName}?`,
      default: 3,
      min: 1,
      max: 20,
    })

    const activities: Activity[] = []
    for (let a = 1; a <= (activityCount ?? 3); a++) {
      const defaultName = a === 1 ? 'Actividad 1 - Contenido principal' : `Actividad ${a}`
      const actName = await input({
        message: `  Nombre de Actividad ${a} en ${moduleName}:`,
        default: defaultName,
      })

      const actType = await select<ActivityType>({
        message: `  Tipo de "${actName}":`,
        choices: ACTIVITY_TYPES,
      })

      const mandatory = await confirm({
        message: `  ¿"${actName}" es obligatoria?`,
        default: a === 1,
      })

      let gatesToNextModule = false
      if (mandatory && m < (moduleCount ?? 4)) {
        gatesToNextModule = await confirm({
          message: `  ¿"${actName}" es requisito para pasar al siguiente módulo?`,
          default: a === 1,
        })
      }

      const completionKind = await select<'view' | 'grade' | 'manual' | 'submission'>({
        message: `  Criterio de finalización para "${actName}":`,
        choices: [
          { value: 'view', name: 'Visualizar la actividad' },
          { value: 'grade', name: 'Obtener nota mínima' },
          { value: 'submission', name: 'Realizar envío' },
          { value: 'manual', name: 'Marcado manual por tutor' },
        ],
      })

      let completionCriteria: CompletionCriteria
      switch (completionKind) {
        case 'grade': {
          const minGrade = await number({
            message: '    Nota mínima (0-100):',
            default: 60,
            min: 0,
            max: 100,
          })
          completionCriteria = { kind: 'grade_threshold', minGrade: minGrade ?? 60 }
          break
        }
        case 'submission':
          completionCriteria = { kind: 'submission' }
          break
        case 'manual':
          completionCriteria = { kind: 'manual' }
          break
        default:
          completionCriteria = { kind: 'view' }
      }

      const rescueTrigger = await confirm({
        message: `  ¿Enviar email de rescate si el alumno no completa "${actName}"?`,
        default: mandatory && a === 1,
      })

      const maintenanceTrigger = await confirm({
        message: `  ¿Enviar email de mantenimiento si el alumno no completa "${actName}"?`,
        default: false,
      })

      const estimatedTime = await number({
        message: `  Tiempo estimado para "${actName}" (minutos):`,
        default: 30,
        min: 1,
      })

      activities.push({
        name: actName,
        order: a,
        type: actType,
        mandatory,
        gatesToNextModule,
        completionCriteria,
        rescueTrigger,
        maintenanceTrigger,
        estimatedTimeMinutes: estimatedTime ?? 30,
      })
    }

    modules.push({
      name: moduleName,
      order: m,
      activities,
    })
  }

  return {
    name,
    slug,
    description,
    modules,
    reengagement: {
      rescueDelayHours: rescueDelay ?? 72,
      maintenanceDelayHours: maintenanceDelay ?? 168,
    },
  }
}
