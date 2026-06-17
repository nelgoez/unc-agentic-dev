import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { stringify } from 'yaml'
import type { CursoConfig, Activity } from './schema/curso'

export function generateCursoKit(config: CursoConfig, outputDir: string): void {
  // Create output directory
  const dir = join(outputDir, config.slug)
  mkdirSync(dir, { recursive: true })
  mkdirSync(join(dir, 'context', 'fases'), { recursive: true })
  mkdirSync(join(dir, 'qa'), { recursive: true })
  mkdirSync(join(dir, '.gemini'), { recursive: true })

  // 1. curso.yaml
  writeFileSync(join(dir, 'curso.yaml'), stringify(config), 'utf-8')

  // 2. .gemini/settings.json
  writeFileSync(join(dir, '.gemini', 'settings.json'), renderGeminiSettings(config), 'utf-8')

  // 3. opencode.jsonc (optional upgrade path)
  writeFileSync(join(dir, 'opencode.jsonc'), renderOpenCodeConfig(config), 'utf-8')

  // 4. context/curso-overview.md
  writeFileSync(join(dir, 'context', 'curso-overview.md'), renderCursoOverview(config), 'utf-8')

  // 5. context/fases/01-fundacion.md
  writeFileSync(
    join(dir, 'context', 'fases', '01-fundacion.md'),
    renderFaseFundacion(config),
    'utf-8',
  )

  // 6. context/fases/02-scaffold.md
  writeFileSync(
    join(dir, 'context', 'fases', '02-scaffold.md'),
    renderFaseScaffold(config),
    'utf-8',
  )

  // 7. context/fases/03-contenido.md
  writeFileSync(
    join(dir, 'context', 'fases', '03-contenido.md'),
    renderFaseContenido(config),
    'utf-8',
  )

  // 8. context/fases/04-revision.md
  writeFileSync(
    join(dir, 'context', 'fases', '04-revision.md'),
    renderFaseRevision(config),
    'utf-8',
  )

  // 9. context/fases/05-publicacion.md
  writeFileSync(
    join(dir, 'context', 'fases', '05-publicacion.md'),
    renderFasePublicacion(config),
    'utf-8',
  )

  // 10. context/fases/06-mantenimiento.md
  writeFileSync(
    join(dir, 'context', 'fases', '06-mantenimiento.md'),
    renderFaseMantenimiento(config),
    'utf-8',
  )

  // 11. qa/checklist-left-right.md
  writeFileSync(join(dir, 'qa', 'checklist-left-right.md'), renderQAChecklist(config), 'utf-8')

  console.log(`\n✅ Curso kit generado en: ${dir}`)
  console.log(`   📁 context/         → Plan del curso + fases`)
  console.log(`   📁 qa/              → Checklist de testing left-right`)
  console.log(`   📄 curso.yaml       → Blueprint machine-readable`)
  console.log(`   📄 .gemini/settings.json → Config para Gemini CLI`)
  console.log(`\n   Para empezar: cd ${config.slug} && gemini`)
}

function renderGeminiSettings(config: CursoConfig): string {
  return JSON.stringify(
    {
      general: {
        sessionRetention: { enabled: true, maxAge: '7d', maxCount: 20 },
      },
      context: {
        fileName: ['context/curso-overview.md'],
        includeDirectories: ['context/fases'],
        loadFromIncludeDirectories: true,
      },
      model: {
        name: 'gemini-2.5-flash',
      },
    },
    null,
    2,
  )
}

function renderOpenCodeConfig(config: CursoConfig): string {
  return `{
  "$schema": "https://opencode.ai/config.json",
  "instructions": [
    "context/curso-overview.md",
    "context/fases/01-fundacion.md",
    "context/fases/02-scaffold.md",
    "context/fases/03-contenido.md",
    "context/fases/04-revision.md",
    "context/fases/05-publicacion.md",
    "context/fases/06-mantenimiento.md",
    "qa/checklist-left-right.md"
  ],
  "mcp": {},
  "permission": {
    "edit": "allow",
    "bash": { "*": "allow" }
  }
}
`
}

function renderCursoOverview(config: CursoConfig): string {
  const mandatoryActs = config.modules.flatMap((m) => m.activities.filter((a) => a.mandatory))
  const totalHours = config.modules.reduce(
    (sum, m) => sum + m.activities.reduce((s, a) => s + a.estimatedTimeMinutes, 0),
    0,
  )

  return `# ${config.name}

${config.description}

## Estructura

- **Módulos:** ${config.modules.length}
- **Actividades totales:** ${config.modules.reduce((sum, m) => sum + m.activities.length, 0)}
- **Tiempo estimado total:** ${Math.round(totalHours / 60)} horas
- **Actividades obligatorias:** ${mandatoryActs.length}

## Módulos

${config.modules
  .map(
    (m) => `### ${m.name}
${m.activities
  .map(
    (a) =>
      `- [${a.mandatory ? 'x' : ' '}] **${a.name}** (${a.type})${a.gatesToNextModule ? ' → *requisito para siguiente módulo*' : ''}${a.rescueTrigger ? ' — 🆘 rescue' : ''}${a.maintenanceTrigger ? ' — 🔄 maintenance' : ''}`,
  )
  .join('\n')}`,
  )
  .join('\n\n')}

## Reengagement

- Rescue email after ${config.reengagement.rescueDelayHours}h of inactivity
- Maintenance email after ${config.reengagement.maintenanceDelayHours}h of inactivity

## Actividades con Rescue Trigger

${config.modules
  .flatMap((m) =>
    m.activities.filter((a) => a.rescueTrigger).map((a) => `- **${m.name}** → ${a.name}`),
  )
  .join('\n')}

---

*Generado por unc-course-kit*
`
}

function formatActivities(config: CursoConfig): string {
  return config.modules
    .map(
      (m) =>
        `### ${m.name}

| # | Actividad | Tipo | Obligatoria | Requisito | Criteria | Rescue | Tiempo |
|---|-----------|------|-------------|-----------|----------|--------|--------|
${m.activities
  .map(
    (a) =>
      `| ${a.order} | ${a.name} | ${a.type} | ${a.mandatory ? 'Sí' : 'No'} | ${a.gatesToNextModule ? 'Sí' : 'No'} | ${renderCriteria(a)} | ${a.rescueTrigger ? 'Sí' : 'No'} | ${a.estimatedTimeMinutes}min |`,
  )
  .join('\n')}`,
    )
    .join('\n\n')
}

function renderCriteria(a: Activity): string {
  switch (a.completionCriteria.kind) {
    case 'view':
      return 'Visualizar'
    case 'grade_threshold':
      return `Nota ≥ ${a.completionCriteria.minGrade}`
    case 'submission':
      return 'Envío'
    case 'manual':
      return 'Manual'
  }
}

function renderFaseFundacion(config: CursoConfig): string {
  return `# Fase 1: Fundación — Definir el curso

## Objetivo

Establecer la estructura base del curso, objetivos de aprendizaje y diseño instruccional antes de generar contenido.

## Qué hacer

1. **Revisar el blueprint** — Lee \`context/curso-overview.md\` y \`curso.yaml\` para entender la estructura definida.
2. **Definir objetivos por módulo** — Para cada módulo, escribí 1-2 objetivos de aprendizaje que el estudiante debe alcanzar.
3. **Identificar prerequisitos** — ¿Qué conocimientos necesita el estudiante antes de empezar ${config.name}?
4. **Diseñar la narrativa** — ¿Cómo se conectan los módulos entre sí? ¿Hay una historia o progresión temática?

## Prompt para Gemini

\`\`\`
Estoy diseñando el curso "${config.name}" para el Campus Virtual UNC.
${config.modules.map((m, i) => `Módulo ${i + 1}: "${m.name}" con ${m.activities.length} actividades.`).join('\n')}

Ayudame a definir:
1. Objetivos de aprendizaje para cada módulo
2. Narrativa/thread conductor entre módulos
3. Prerequisitos recomendados para el estudiante
4. Sugerencias de contenido para cada actividad según su tipo
\`\`\`

## Output esperado

- \`context/objetivos.md\` con objetivos por módulo
- \`context/narrativa.md\` con la progresión pedagógica

## Checklist

- [ ] Objetivos definidos por módulo
- [ ] Prerequisitos documentados
- [ ] Narrativa del curso trazada
- [ ] Tipo de contenido decidido por actividad
`
}

function renderFaseScaffold(config: CursoConfig): string {
  return `# Fase 2: Scaffold — Armar la estructura en Moodle

## Objetivo

Crear la estructura vacía del curso en Moodle: módulos, secciones y actividades sin contenido todavía.

## Qué hacer

1. **Crear los módulos** en Moodle (o generar el archivo de configuración)
2. **Crear cada actividad** con su nombre y tipo, sin contenido todavía
3. **Configurar las condiciones de acceso** (actividades que gatean al siguiente módulo)
4. **Configurar los triggers de reengagement** en \`mod_reengagement\`

## Actividades que requieren configuración especial

${config.modules
  .flatMap((m) =>
    m.activities
      .filter((a) => a.gatesToNextModule || a.rescueTrigger || a.maintenanceTrigger)
      .map(
        (a) =>
          `- **${m.name} > ${a.name}**:${a.gatesToNextModule ? ' [GATE]' : ''}${a.rescueTrigger ? ' [RESCUE]' : ''}${a.maintenanceTrigger ? ' [MAINTENANCE]' : ''}`,
      ),
  )
  .join('\n')}

## Prompt para Gemini

\`\`\`
Necesito configurar el curso "${config.name}" en Moodle.

Estructura:
${formatActivities(config)}

Actividades con condición de acceso (gates):
${config.modules
  .flatMap((m) =>
    m.activities
      .filter((a) => a.gatesToNextModule)
      .map((a) => `- "${a.name}" en ${m.name} — completar esto desbloquea el siguiente módulo`),
  )
  .join('\n')}

Generame:
1. La configuración XML o los pasos para crear esta estructura en Moodle
2. Las reglas de \`availability\` para las actividades gate
3. La configuración de \`mod_reengagement\` para rescue y maintenance
\`\`\`

## Checklist

- [ ] Módulos creados en Moodle
- [ ] Actividades creadas (sin contenido)
- [ ] Condiciones de acceso configuradas
- [ ] Triggers de reengagement configurados
- [ ] Roles y permisos verificados
`
}

function renderFaseContenido(config: CursoConfig): string {
  const htmlActivities = config.modules.flatMap((m) =>
    m.activities.filter((a) => a.type === 'html' || a.type === 'video' || a.type === 'url'),
  )

  return `# Fase 3: Contenido — Generar materiales con Gemini

## Objetivo

Generar el contenido HTML, textos, consignas y recursos para cada actividad usando Gemini.

## Qué hacer

Para cada módulo y actividad, generar el contenido según el tipo:

${config.modules
  .map(
    (m) => `### ${m.name}
${m.activities
  .map((a) => {
    const prompts: Record<string, string> = {
      html: 'Página HTML con contenido teórico, imágenes y ejemplos',
      quiz: 'Preguntas de opción múltiple, verdadero/falso o completar',
      assignment: 'Consigna de tarea con criterios de evaluación',
      forum: 'Pregunta disparadora para discusión',
      video: 'Script para video + instrucciones de embebido',
      h5p: 'Especificación para actividad H5P interactiva',
      feedback: 'Preguntas para encuesta de retroalimentación',
      url: 'Enlace a recurso externo con breve descripción',
    }
    return `  - **${a.name}** (${a.type}): ${prompts[a.type] ?? 'Contenido genérico'}`
  })
  .join('\n')}`,
  )
  .join('\n\n')}

## Prompt para Gemini (genérico — usar por actividad)

\`\`\`
Soy creador de contenido para el curso "${config.name}", módulo "[NOMBRE_MODULO]".

Necesito generar el contenido para la actividad "[NOMBRE_ACTIVIDAD]" de tipo "[TIPO]".

Contexto del curso:
- Curso: ${config.name}
- Descripción: ${config.description}
- Es actividad obligatoria: [Sí/No]
- Tiempo estimado: [X] minutos

Generame el contenido completo en HTML que pueda subir directamente a Moodle.
Incluí:
- Título y subtítulos claros
- Contenido teórico conciso
- Ejemplos prácticos relacionados con la vida universitaria
- Si aplica, ejercicios o preguntas de autoevaluación
- Diseño responsive (que se vea bien en mobile)
\`\`\`

## Tips

- Pedile a Gemini que genere **HTML autónomo** (sin depender de CSS externo)
- Para actividades HTML, pedí: "Generame el HTML completo listo para pegar en Moodle"
- Para quizzes, pedí formato GIFT o Moodle XML
- Verificá que los links funcionen antes de pasar a la siguiente fase

## Checklist

- [ ] Contenido HTML generado para cada actividad
- [ ] Quizzes creados con preguntas
- [ ] Consignas de tarea redactadas
- [ ] Foros con preguntas disparadoras
- [ ] Videos seleccionados/embebidos
- [ ] Links verificados
`
}

function renderFaseRevision(config: CursoConfig): string {
  return `# Fase 4: Revisión — Control de calidad del contenido

## Objetivo

Verificar que todo el contenido sea correcto, accesible, consistente y esté listo para publicar.

## Qué revisar

### 1. Contenido
- [ ] Ortografía y gramática en todos los textos
- [ ] Tono consistente en todo el curso
- [ ] Las instrucciones son claras para el estudiante
- [ ] No hay referencias rotas a otros módulos/actividades

### 2. Links y recursos
- [ ] Todos los enlaces externos funcionan
- [ ] Los videos embebidos se cargan correctamente
- [ ] Los archivos adjuntos están subidos

### 3. Accesibilidad
- [ ] Las imágenes tienen texto alternativo (alt)
- [ ] El contraste de colores es suficiente
- [ ] El contenido es navegable con teclado
- [ ] Los videos tienen subtítulos o transcripción

### 4. Consistencia pedagógica
- [ ] Los objetivos del módulo se cumplen con las actividades
- [ ] La progresión módulo a módulo tiene sentido
- [ ] Las actividades obligatorias están marcadas como tales
- [ ] Los criterios de finalización son razonables

### 5. Configuración técnica
- [ ] Las condiciones de acceso (gates) están bien configuradas
- [ ] Los triggers de reengagement apuntan a las actividades correctas
- [ ] Los tiempos estimados son realistas

## Prompt para Gemini

\`\`\`
Actuá como revisor pedagógico del curso "${config.name}".

Estructura del curso:
${formatActivities(config)}

Revisame:
1. ¿La progresión de módulos tiene sentido pedagógico?
2. ¿Las actividades obligatorias están bien elegidas?
3. ¿Hay suficientes actividades de evaluación?
4. ¿El tiempo estimado total es razonable?

Dame sugerencias concretas de mejora.
\`\`\`

## Checklist final

- [ ] Revisión de contenido completa
- [ ] Links verificados
- [ ] Accesibilidad revisada
- [ ] Consistencia pedagógica confirmada
- [ ] Configuración técnica validada
`
}

function renderFasePublicacion(config: CursoConfig): string {
  return `# Fase 5: Publicación — Subir a Moodle y activar

## Objetivo

Publicar todo el contenido en Moodle, activar las actividades y verificar que el curso funcione correctamente.

## Qué hacer

1. **Subir contenido HTML** a cada página/actividad en Moodle
2. **Configurar quizzes** con preguntas desde el banco de preguntas
3. **Activar condiciones de acceso** (restricciones entre módulos)
4. **Activar reengagement** para las actividades con rescue/maintenance trigger
5. **Verificar visibilidad** — el curso debe verse correctamente como estudiante

## Actividades para reengagement

${config.modules
  .flatMap((m) =>
    m.activities
      .filter((a) => a.rescueTrigger || a.maintenanceTrigger)
      .map((a) => {
        const triggers = []
        if (a.rescueTrigger) triggers.push('RESCUE')
        if (a.maintenanceTrigger) triggers.push('MAINT')
        return `- **${m.name} > ${a.name}**: ${triggers.join(' + ')}`
      }),
  )
  .join('\n')}

## Prompt para Gemini

\`\`\`
Necesito publicar el curso "${config.name}" en Moodle.

Dame una guía paso a paso para:
1. Subir contenido HTML a cada actividad
2. Configurar \`mod_reengagement\` para rescue y maintenance
3. Configurar availability/restricciones para las actividades gate
4. Verificar que todo funciona desde el rol de estudiante

El curso tiene ${config.modules.length} módulos y las siguientes actividades con config especial:
${config.modules
  .flatMap((m) =>
    m.activities
      .filter((a) => a.gatesToNextModule || a.rescueTrigger || a.maintenanceTrigger)
      .map((a) =>
        `- "${a.name}" en ${m.name}: ${a.gatesToNextModule ? 'gate' : ''} ${a.rescueTrigger ? 'rescue' : ''} ${a.maintenanceTrigger ? 'maintenance' : ''}`.trim(),
      ),
  )
  .join('\n')}
\`\`\`

## Checklist

- [ ] Contenido HTML subido a cada actividad
- [ ] Quizzes publicados con preguntas
- [ ] Condiciones de acceso activadas
- [ ] Reengagement configurado y activo
- [ ] Curso visible para estudiantes
- [ ] Vista previa como estudiante verificada
`
}

function renderFaseMantenimiento(config: CursoConfig): string {
  return `# Fase 6: Mantenimiento — Monitoreo y optimización continua

## Objetivo

Monitorear el progreso de los estudiantes, ajustar triggers de reengagement y optimizar el curso basado en datos.

## Qué monitorear

### KPIs semanales
- **Tasa de Reactivación (%)** — Inactivos que completaron actividad rescue tras email
- **Tiempo Medio de Respuesta** — Horas hasta completar la actividad rescue
- **Tasa de Abandono por módulo** — % de estudiantes que no avanzan al siguiente módulo
- **Tiempo promedio por módulo** vs cohortes anteriores

### Puntos de rescate activos

${config.modules
  .flatMap((m) =>
    m.activities
      .filter((a) => a.rescueTrigger)
      .map(
        (a) =>
          `- **${m.name} > ${a.name}**: rescue a las ${config.reengagement.rescueDelayHours}h de inactividad`,
      ),
  )
  .join('\n')}

### Puntos de mantenimiento activos

${config.modules
  .flatMap((m) =>
    m.activities
      .filter((a) => a.maintenanceTrigger)
      .map(
        (a) =>
          `- **${m.name} > ${a.name}**: maintenance a las ${config.reengagement.maintenanceDelayHours}h de inactividad`,
      ),
  )
  .join('\n')}

## Eventos de Moodle a trackear

- \`\\mod_reengagement\\event\\email_sent\` — email dispatch
- \`\\core\\event\\course_module_completion_updated\` — activity completion

## Prompt para Gemini

\`\`\`
Soy el coordinador del curso "${config.name}" en UNC Campus Virtual.

Actualmente tengo estos KPIs:
- Tasa de Reactivación: [X]%
- Tiempo Medio de Respuesta: [X] horas
- Tasa de Abandono Módulo 1->2: [X]%

Basado en estos datos, recomendame:
1. ¿Ajusto los tiempos de rescue/maintenance?
2. ¿Hay actividades que deberían ser obligatorias y no lo son?
3. ¿El contenido de alguna actividad necesita mejora?
4. ¿Qué módulo tiene mayor tasa de abandono y por qué?
\`\`\`

## Checklist mensual

- [ ] Revisar KPIs del dashboard
- [ ] Ajustar tiempos de reengagement si es necesario
- [ ] Actualizar contenido basado en feedback de estudiantes
- [ ] Revisar consultas en foros y responder pendientes
- [ ] Reportar avances al equipo
`
}

function renderQAChecklist(config: CursoConfig): string {
  const gateActivities = config.modules.flatMap((m) =>
    m.activities.filter((a) => a.gatesToNextModule),
  )

  return `# QA: Left-Right Testing — ${config.name}

## Cobertura de actividades obligatorias

${config.modules
  .map((m) => {
    const mandatory = m.activities.filter((a) => a.mandatory)
    return mandatory.length > 0
      ? `### ${m.name}\n${mandatory.map((a) => `- [ ] ${a.order}. ${a.name}`).join('\n')}`
      : `### ${m.name}\n- _Sin actividades obligatorias_`
  })
  .join('\n\n')}

## Pruebas de flujo (left-right)

### Progresión normal
- [ ] Completar Módulo 1 → verificar que Módulo 2 se desbloquea
- [ ] Completar Módulo 2 → verificar que Módulo 3 se desbloquea
${config.modules.length > 3 ? `- [ ] Completar Módulo ${config.modules.length - 1} → verificar que Módulo ${config.modules.length} se desbloquea` : ''}
- [ ] Completar todos los módulos → verificar que se marca curso completo

### Puertas (gates)
${gateActivities.length > 0 ? gateActivities.map((a) => `- [ ] No completar "${a.name}" → verificar que el siguiente módulo está bloqueado`).join('\n') : '- _No hay actividades con gate_'}
${gateActivities.length > 0 ? gateActivities.map((a) => `- [ ] Completar "${a.name}" → verificar que el siguiente módulo se desbloquea inmediatamente`).join('\n') : ''}

### Rescate (reengagement)
${
  config.modules.flatMap((m) => m.activities.filter((a) => a.rescueTrigger)).length > 0
    ? config.modules
        .flatMap((m) => m.activities.filter((a) => a.rescueTrigger))
        .map(
          (a) =>
            `- [ ] Simular inactividad en "${a.name}" → verificar que se dispara email de rescue a las ${config.reengagement.rescueDelayHours}h`,
        )
        .join('\n')
    : '- _No hay actividades con rescue trigger_'
}
${
  config.modules.flatMap((m) => m.activities.filter((a) => a.maintenanceTrigger)).length > 0
    ? config.modules
        .flatMap((m) => m.activities.filter((a) => a.maintenanceTrigger))
        .map(
          (a) =>
            `- [ ] Simular inactividad prolongada en "${a.name}" → verificar email de maintenance a las ${config.reengagement.maintenanceDelayHours}h`,
        )
        .join('\n')
    : ''
}

### Finalización
- [ ] Verificar que cada actividad tiene su criterio de finalización correcto
- [ ] Verificar que las actividades obligatorias NO pueden skippearse
- [ ] Verificar que las actividades opcionales NO bloquean el avance

### Visualización desde rol estudiante
- [ ] Vista mobile: contenido responsive, imágenes escalan
- [ ] Vista desktop: layout correcto, sin superposiciones
- [ ] Navegación: los links funcionan, las actividades se abren
- [ ] Tiempos estimados visibles para el estudiante

## Resumen de configuración

| Aspecto | Valor |
|---------|-------|
| Rescue delay | ${config.reengagement.rescueDelayHours}h |
| Maintenance delay | ${config.reengagement.maintenanceDelayHours}h |
| Actividades gate | ${gateActivities.length} |
| Actividades rescue | ${config.modules.flatMap((m) => m.activities.filter((a) => a.rescueTrigger)).length} |
| Actividades maintenance | ${config.modules.flatMap((m) => m.activities.filter((a) => a.maintenanceTrigger)).length} |
| Tiempo total estimado | ${Math.round(config.modules.reduce((sum, m) => sum + m.activities.reduce((s, a) => s + a.estimatedTimeMinutes, 0), 0) / 60)}h |

---
*QA generado por unc-course-kit*
`
}
