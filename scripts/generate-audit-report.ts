import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'

interface ActivityData {
  name: string
  type: string
  href: string
  isVisible: boolean
  hasCompletionTracking: boolean
  isComplete: boolean
  availabilityInfo: string
}

interface SectionData {
  number: number
  title: string
  isLocked: boolean
  restrictionText: string
  activities: ActivityData[]
  allVisibleComplete: boolean
}

interface CourseStructure {
  courseName: string
  courseUrl: string
  tabs: { title: string; sectionNumber: number; isDisabled: boolean; restrictionText: string }[]
  sections: SectionData[]
}

interface AuditFinding {
  severity: 'critical' | 'warning' | 'info'
  sectionNumber: number
  sectionTitle: string
  message: string
  detail: string
}

interface ApiAuditResults {
  courseId: string
  timestamp: string
  courseName: string
  sections: number
  totalActivities: number
  restrictedActivities: number
  orphansFound: number
  apiFindings: Array<{
    severity: string
    type: string
    section: string
    message: string
    detail: string
  }>
  breakdown: {
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
        completiondata: {
          state: number
          timecompleted: number
          overrideby: number | null
          hascompletion: boolean
          isautomatic: boolean
          istrackeduser: boolean
          uservisible: boolean
        } | null
        groupmode: number
        groupingid: number
      }>
    }>
    totalActivities: number
    restrictedActivities: number
  }
  progression: {
    user: string
    trackedActivities: number
    alreadyComplete: number
    autoProgressed: number
  } | null
  dbProbes?: {
    enrollment: { total: number; students: number; teachers: number; status: string } | null
    gradeItems: { total: number; status: string } | null
    cohorts: { total: number; names: string[]; status: string } | null
  }
}

interface AuditResults {
  courseId: string
  courseName: string
  timestamp: string
  runUrl: string
  allureUrl: string
  adminView: CourseStructure
  studentView: CourseStructure
  teacherView: CourseStructure
  findings: AuditFinding[]
  screenshots: { role: string; sectionNumber: number; data: string }[]
}

function loadJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, 'utf-8')) as T
}

function loadScreenshots(dir: string): { role: string; sectionNumber: number; data: string }[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => /course-\d+-(admin|teacher|student)-section-\d+\.png/.test(f))
    .map((f) => {
      const match = f.match(/course-\d+-(\w+)-section-(\d+)\.png/)
      const role = match ? match[1] : 'unknown'
      const sectionNumber = match ? Number.parseInt(match[2], 10) : 0
      const data = readFileSync(resolve(dir, f)).toString('base64')
      return { role, sectionNumber, data }
    })
}

function severityInfo(severity: string): { icon: string; label: string } {
  switch (severity) {
    case 'critical':
      return { icon: '🔴', label: 'Crítico' }
    case 'warning':
      return { icon: '🟡', label: 'Advertencia' }
    case 'info':
      return { icon: '🔵', label: 'Informativo' }
    default:
      return { icon: '⚪', label: 'Desconocido' }
  }
}

function buildHTML(results: AuditResults, apiResults: ApiAuditResults | null = null): string {
  const {
    courseId,
    courseName,
    timestamp,
    allureUrl,
    findings,
    adminView,
    teacherView,
    studentView,
    screenshots,
  } = results

  const criticalCount = findings.filter((f) => f.severity === 'critical').length
  const warningCount = findings.filter((f) => f.severity === 'warning').length
  const infoCount = findings.filter((f) => f.severity === 'info').length
  const lockedSections = studentView.sections.filter((s) => s.isLocked).length
  const totalSections = studentView.sections.length

  const screenshotMap = new Map<string, string>()
  for (const s of screenshots) {
    screenshotMap.set(`${s.role}|${s.sectionNumber}`, s.data)
  }

  const triggerUrl = 'https://github.com/nelgoez/unc-agentic-dev/actions/workflows/audit-ci.yml'
  const date = new Date(timestamp).toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  // Issues resolved (historical)
  const resolvedHTML = `\
  <h2 class="section-title">✅ Problemas anteriores que ya no aparecen</h2>
  <div class="finding good" style="border-left-color:var(--good)">
    <div class="finding-header" onclick="this.classList.toggle('open')" style="cursor:pointer">
      <span class="icon">✅</span>
      <span class="msg"><strong>Actividad fantasma "Notebook Funcion-Lambda"</strong> — Reportado el 17/7, verificado como resuelto el 22/7</span>
      <span class="chevron">▶</span>
    </div>
    <div class="finding-detail">
      <p style="margin-bottom:8px">El problema original que motivó esta auditoría: el Módulo 3 requería una actividad llamada "Notebook Funcion-Lambda" que existía en las condiciones de disponibilidad pero no como un recurso visible en el curso. Cualquier estudiante nuevo quedaba atascado en Módulo 2 sin poder avanzar.</p>
      <p style="margin-bottom:8px"><strong>¿Cómo lo detectamos?</strong> Nelthor (un estudiante real, antes de ser promovido a administrador) reportó que no podía acceder al Módulo 3. Al investigar, descubrimos que la condición de disponibilidad apuntaba a una actividad que no existía como recurso visible.</p>
      <p><strong>¿Está resuelto?</strong> La verificación del 22/7 confirma que la actividad ya existe en el curso (0 dependencias rotas). El equipo de Campus Virtual probablemente restauró o recreó el recurso faltante.</p>
    </div>
  </div>`

  // Build cross-referenced findings grouped by section
  const sectionMap = new Map<string, { ui: AuditFinding[]; api: ApiAuditResults['apiFindings'] }>()
  for (const f of findings) {
    const key = f.sectionTitle
    if (!sectionMap.has(key)) sectionMap.set(key, { ui: [], api: [] })
    sectionMap.get(key)!.ui.push(f)
  }
  if (apiResults) {
    for (const f of apiResults.apiFindings) {
      const key = f.section
      if (!sectionMap.has(key)) sectionMap.set(key, { ui: [], api: [] })
      sectionMap.get(key)!.api.push(f)
    }
  }

  // Build API module lookup by name
  const apiModuleByName = new Map<
    string,
    {
      completion: number
      overrideby: number | null
      hascompletion: boolean
      isautomatic: boolean
      groupmode: number
      groupingid: number
    }
  >()
  if (apiResults?.breakdown?.sections) {
    for (const section of apiResults.breakdown.sections) {
      for (const mod of section.modules || []) {
        apiModuleByName.set(mod.name.toLowerCase(), {
          completion: mod.completion,
          overrideby: mod.completiondata?.overrideby ?? null,
          hascompletion: mod.completiondata?.hascompletion ?? false,
          isautomatic: mod.completiondata?.isautomatic ?? false,
          groupmode: mod.groupmode,
          groupingid: mod.groupingid,
        })
      }
    }
  }

  let unifiedHTML = ''
  if (sectionMap.size === 0) {
    unifiedHTML = `<div class="no-findings"><div class="emoji">✅</div><h3>No se encontraron incidencias</h3><p class="dim">El curso supera la auditoría sin hallazgos críticos ni advertencias.</p></div>`
  } else {
    unifiedHTML = `<h2 class="section-title">🔎 Hallazgos actuales</h2>
    <p style="font-size:0.85em;color:var(--text-2);margin-bottom:12px">Cada sección del curso analizada de dos maneras: <span class="badge-ui">Recorrido como alumno</span> (navegamos el curso como lo haría un estudiante nuevo) y <span class="badge-srv">Análisis del servidor</span> (revisamos la configuración interna del curso).</p>`
    for (const [sectionName, group] of sectionMap) {
      const allFindings = [...group.ui, ...group.api]
      const sectionCritical = allFindings.filter((f) => f.severity === 'critical').length
      const sectionTotal = allFindings.length
      unifiedHTML += `
    <div class="finding ${sectionCritical > 0 ? 'critical' : 'info'}" onclick="this.classList.toggle('open')">
      <div class="finding-header">
        <span class="icon">${sectionCritical > 0 ? '🔴' : '🔵'}</span>
        <span class="msg"><strong>${esc(sectionName)}</strong> — ${sectionCritical} crítico(s), ${sectionTotal} hallazgo(s) en total</span>
        <span class="chevron">▶</span>
      </div>
      <div class="finding-detail">`
      for (const f of group.ui) {
        const si = severityInfo(f.severity)
        const stuScreenshot = screenshotMap.get(`student|${f.sectionNumber}`)
        let apiNote = ''
        if (f.message.includes('no puede marcarse como completada')) {
          const nameMatch = f.message.match(/"([^"]+)"/)
          const actName = nameMatch?.[1]
          const apiMod = actName ? apiModuleByName.get(actName.toLowerCase()) : undefined
          if (apiMod) {
            if (apiMod.groupmode > 0) {
              const groupLabel = apiMod.groupmode === 1 ? 'grupos separados' : 'grupos visibles'
              apiNote = `<p class="dim" style="margin-top:4px;font-size:0.85em">👥 <strong>Actividad grupal</strong> (${groupLabel}) — puede completarse cuando el docente o el grupo complete su parte, sin necesidad de checkbox individual.</p>`
            }
            if (apiMod.completion === 0) {
              apiNote = `<p class="dim" style="margin-top:4px;font-size:0.85em">🔍 <strong>Confirmado por el servidor:</strong> el seguimiento de finalización está deshabilitado (completion=0).</p>`
            } else if (apiMod.completion === 1) {
              apiNote = `<p class="dim" style="margin-top:4px;font-size:0.85em">🔍 <strong>El servidor indica</strong> que hay seguimiento manual (completion=1), pero no se ve el checkbox en la página. Posible bug de interfaz o permiso.</p>`
            } else if (apiMod.completion === 2) {
              apiNote = `<p class="dim" style="margin-top:4px;font-size:0.85em">🔍 <strong>El servidor indica</strong> que hay seguimiento automático (completion=2), pero no se ve el indicador en la página.</p>`
            }
            if (apiMod.overrideby !== null) {
              apiNote += `<p class="dim" style="margin-top:4px;font-size:0.85em">👤 <strong>Finalización forzada</strong> por un docente/administrador (override activo).</p>`
            }
          } else {
            apiNote = `<p class="dim" style="margin-top:4px;font-size:0.85em">🔍 No se encontraron datos del servidor para esta actividad — posiblemente no existe como módulo en la respuesta del API.</p>`
          }
        }
        unifiedHTML += `
        <div style="margin:8px 0;padding:8px;background:var(--bg);border-radius:4px;border-left:3px solid ${f.severity === 'critical' ? 'var(--bad)' : f.severity === 'warning' ? 'var(--warn)' : 'var(--accent)'}">
          <span class="badge-ui">UI</span> ${si.icon} <strong>${esc(f.message)}</strong>
          <p class="dim" style="margin-top:4px;font-size:0.9em">${esc(f.detail)}</p>
          ${apiNote}
          ${stuScreenshot ? `<div class="screenshot" style="margin-top:6px"><img src="data:image/png;base64,${stuScreenshot}" alt="Captura sección ${f.sectionNumber}"><div class="caption">📸 Vista como estudiante - Sección ${f.sectionNumber}</div></div>` : ''}
        </div>`
      }
      for (const f of group.api) {
        const si = severityInfo(f.severity)
        unifiedHTML += `
        <div style="margin:8px 0;padding:8px;background:var(--bg);border-radius:4px;border-left:3px solid var(--accent)">
          <span class="badge-srv">Análisis del servidor</span> ${si.icon} <strong>${esc(f.message)}</strong>
          <p class="dim" style="margin-top:4px;font-size:0.9em">${esc(f.detail)}</p>
        </div>`
      }
      unifiedHTML += `\n      </div>\n    </div>`
    }
  }

  // DB probes section
  let dbProbesHTML = ''
  if (apiResults?.dbProbes) {
    const dp = apiResults.dbProbes
    dbProbesHTML = `<h2 class="section-title">📋 Datos del curso</h2>
    <p style="font-size:0.85em;color:var(--text-2);margin-bottom:12px">Información general sobre el curso y sus participantes, obtenida desde el servidor.</p>`

    if (dp.enrollment) {
      dbProbesHTML += `<div class="finding info"><div class="finding-header"><span class="icon">👥</span><span class="msg"><strong>Inscripciones:</strong> ${dp.enrollment.total} usuarios (${dp.enrollment.students} estudiantes, ${dp.enrollment.teachers} docentes)</span></div></div>`
    } else {
      dbProbesHTML += `<div class="finding info"><div class="finding-header"><span class="icon">👥</span><span class="msg"><strong>Inscripciones:</strong> Datos no disponibles — función no agregada al servicio</span></div></div>`
    }
    if (dp.gradeItems) {
      dbProbesHTML += `<div class="finding info"><div class="finding-header"><span class="icon">📊</span><span class="msg"><strong>Notas y calificaciones:</strong> ${dp.gradeItems.total} items registrados</span></div></div>`
    } else {
      dbProbesHTML += `<div class="finding info"><div class="finding-header"><span class="icon">📊</span><span class="msg"><strong>Notas y calificaciones:</strong> Datos no disponibles — función no agregada al servicio</span></div></div>`
    }
    if (dp.cohorts && dp.cohorts.status === 'unavailable') {
      dbProbesHTML += `<div class="finding info"><div class="finding-header"><span class="icon">👪</span><span class="msg"><strong>Grupos (cohorts):</strong> No se encontraron cohorts para este curso — la función web funciona correctamente.</span></div></div>`
    } else if (dp.cohorts) {
      dbProbesHTML += `<div class="finding info"><div class="finding-header"><span class="icon">👪</span><span class="msg"><strong>Grupos:</strong> ${dp.cohorts.total} (${dp.cohorts.names.join(', ')})</span></div></div>`
    } else {
      dbProbesHTML += `<div class="finding info"><div class="finding-header"><span class="icon">👪</span><span class="msg"><strong>Grupos:</strong> Datos no disponibles</span></div></div>`
    }
  }

  // Progression / nelthor comparison
  let progressionHTML = ''
  if (apiResults?.progression) {
    const p = apiResults.progression
    progressionHTML = `
    <h2 class="section-title">🎓 Comparación: nelthor vs. estudiante nuevo</h2>
    <p style="font-size:0.85em;color:var(--text-2);margin-bottom:12px">Nelthor es un usuario que recorrió el curso ANTES de ser promovido a administrador, cuando el seguimiento de finalización funcionaba correctamente. Su progreso histórico (${p.alreadyComplete}/${p.trackedActivities}) muestra que el curso SÍ era funcional en ese momento. Un estudiante nuevo arranca desde cero y se encuentra con una configuración distinta.</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
      <div class="finding info" style="border-left-color:var(--good)">
        <div class="finding-header">
          <span class="icon">👤</span>
          <span class="msg"><strong>nelthor (antes de ser admin)</strong><br><span class="dim" style="font-size:0.85em">Progreso: ${p.alreadyComplete}/${p.trackedActivities} actividades completadas</span></span>
        </div>
        <div class="finding-detail" style="display:block;padding:8px 16px 12px">
          <p>Nelthor cursó cuando las actividades tenían seguimiento de finalización. Completó las 4 actividades de Bienvenida, desbloqueó Módulo 1, luego Módulo 2, y llegó hasta Módulo 3 donde encontró el phantom "Notebook Funcion-Lambda" que lo frenó. Ese phantom ya fue reparado, pero el seguimiento de las actividades iniciales ya no funciona para estudiantes nuevos.</p>
        </div>
      </div>
      <div class="finding info" style="border-left-color:var(--bad)">
        <div class="finding-header">
          <span class="icon">🆕</span>
          <span class="msg"><strong>Estudiante nuevo (hoy)</strong><br><span class="dim" style="font-size:0.85em">Actividades completadas: 0</span></span>
        </div>
        <div class="finding-detail" style="display:block;padding:8px 16px 12px">
          <p>Un estudiante que se inscribe HOY encuentra las 4 actividades de Bienvenida, pero no puede marcarlas como completadas. Alguien deshabilitó el seguimiento de finalización después de que nelthor las completara. Sin ese tracking, Módulo 1 nunca se desbloquea, y en cadena tampoco Módulo 2, Módulo 3 ni Cierre.</p>
        </div>
      </div>
    </div>`
  }

  // Caveats / what we couldn't verify
  const caveatsHTML = `
  <h2 class="section-title">⚠️ Cosas que no pudimos verificar</h2>
  <div style="background:var(--surface);border-radius:var(--radius-lg);padding:20px;box-shadow:var(--shadow);margin-bottom:16px">
    <p style="margin-bottom:8px"><strong>Este análisis tiene limitaciones. No podemos confirmar:</strong></p>
    <ul style="margin-left:20px;line-height:1.8">
      <li>Si un docente puede <strong>marcar manualmente</strong> como completada una actividad desde el libro de calificaciones. Nuestra herramienta recorre el curso como alumno, no como administrador.</li>
      <li>Si el equipo de Campus Virtual realizó <strong>cambios entre la detección del problema y esta verificación</strong>. Los datos reflejan el momento exacto de la auditoría.</li>
      <li>Si el seguimiento de finalización de las 4 actividades de Bienvenida se deshabilitó <strong>por accidente o intencionalmente</strong>. Nelthor las completó antes de ser admin, cuando el tracking funcionaba.</li>
      <li>Si hay <strong>otras formas de completar actividades</strong> que no pasan por la casilla de verificación en la página del curso (ej: aprobación directa del docente, finalización por grupo, integraciones externas).</li>
      <li>Restricciones por <strong>grupos (cohorts)</strong> — la función web de cohorts no está disponible en el servicio UNC Auditor. Cualquier curso que use cohorts para matricular o restringir acceso no está siendo auditado en ese aspecto.</li>
    </ul>
    <p style="margin-top:12px;font-size:0.85em"><strong>📋 Para mejorar la cobertura:</strong> Actualmente no podemos auditar restricciones por cohorts si el curso las usa. Si algún curso usa cohorts para matricular o restringir acceso, avísenos para ajustar la detección.</p>
    <p style="margin-top:12px;font-size:0.85em;color:var(--text-2)">💡 Si encontrás un hallazgo que no coincide con la realidad del curso, <strong>avisanos</strong> para ajustar la detección. Esta herramienta mejora con cada feedback.</p>
  </div>`

  // Side-by-side: all sections from all 3 roles
  let compareHTML = `<h2 class="section-title">Comparación visual: Admin · Teacher · Student</h2>
  <p style="font-size:0.85em;color:var(--text-2);margin-bottom:12px">Cada sección del curso vista desde los tres roles. El admin es la fuente de verdad — lo que el estudiante NO ve está destacado.</p>`
  for (const section of adminView.sections) {
    const teacherSection = teacherView.sections.find((s) => s.number === section.number)
    const studentSection = studentView.sections.find((s) => s.number === section.number)
    const tActs = teacherSection?.activities.length ?? 0
    const sActs = studentSection?.activities.length ?? 0
    const diffT = section.activities.length - tActs
    const diffS = section.activities.length - sActs
    const isLocked = studentSection?.isLocked ?? false

    const adminScreenshot = screenshotMap.get(`admin|${section.number}`)
    const teacherScreenshot = screenshotMap.get(`teacher|${section.number}`)
    const studentScreenshot = screenshotMap.get(`student|${section.number}`)

    compareHTML += `
  <div class="finding ${isLocked ? 'critical' : diffS > 0 ? 'warning' : 'good'}">
    <div class="finding-header" onclick="this.parentElement.classList.toggle('open')">
      <span class="icon">${isLocked ? '🔒' : '👁️'}</span>
      <span class="msg"><strong>${esc(section.title)}</strong> — Admin: ${section.activities.length} | Teacher: ${tActs} ${diffT > 0 ? `<span style="color:var(--warn)">(-${diffT})</span>` : ''} | Student: ${sActs} ${diffS > 0 ? `<span style="color:var(--bad)">(-${diffS})</span>` : ''} ${isLocked ? '🔒 Bloqueado' : ''}</span>
      <span class="chevron">▶</span>
    </div>
    <div class="finding-detail">
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:8px">
        <div style="flex:1;min-width:180px;background:var(--bg);border-radius:var(--radius);padding:10px">
          <div style="font-weight:700;color:var(--accent);margin-bottom:4px">👤 Admin (${section.activities.length} act.)</div>
          ${adminScreenshot ? `<div class="screenshot" style="margin:0 0 4px"><img src="data:image/png;base64,${adminScreenshot}" alt="Admin sección ${section.number}"></div>` : ''}
          <ul style="margin:4px 0 0 14px;font-size:0.8em">${section.activities.map((a) => `<li>${a.isVisible ? '✅' : '👻'} ${esc(a.name)}${a.availabilityInfo ? `<br><span class="dim" style="font-size:0.85em">📋 ${esc(a.availabilityInfo)}</span>` : ''}</li>`).join('') || '<li>Sin actividades</li>'}</ul>
        </div>
        <div style="flex:1;min-width:180px;background:var(--bg);border-radius:var(--radius);padding:10px">
          <div style="font-weight:700;color:var(--warn);margin-bottom:4px">👩‍🏫 Teacher (${tActs} act.)</div>
          ${teacherScreenshot ? `<div class="screenshot" style="margin:0 0 4px"><img src="data:image/png;base64,${teacherScreenshot}" alt="Teacher sección ${section.number}"></div>` : ''}
          <ul style="margin:4px 0 0 14px;font-size:0.8em">${(teacherSection?.activities ?? []).map((a) => `<li>${a.isVisible ? '✅' : '👻'} ${esc(a.name)}</li>`).join('') || '<li>Sin actividades</li>'}</ul>
        </div>
        <div style="flex:1;min-width:180px;background:var(--bg);border-radius:var(--radius);padding:10px">
          <div style="font-weight:700;color:${isLocked ? 'var(--bad)' : 'var(--good)'};margin-bottom:4px">🎓 Student (${sActs} act.)${isLocked ? ' 🔒' : ''}</div>
          ${studentScreenshot ? `<div class="screenshot" style="margin:0 0 4px"><img src="data:image/png;base64,${studentScreenshot}" alt="Student sección ${section.number}"></div>` : ''}
          <ul style="margin:4px 0 0 14px;font-size:0.8em">${(studentSection?.activities ?? []).map((a) => `<li>${a.isVisible ? '✅' : '👻'} ${esc(a.name)}</li>`).join('') || '<li>Sin actividades</li>'}</ul>
        </div>
      </div>
    </div>
  </div>`
  }

  let devNote = ''
  if (findings.length > 0) {
    const lockedSection = studentView.sections.find((s) => s.isLocked)
    devNote = `
    <h2 class="section-title">🧪 Cómo reproducir este hallazgo manualmente</h2>
    <p style="font-size:0.85em;color:var(--text-2);margin-bottom:12px">Seguí estos pasos con tu propio usuario admin para ver el mismo mismatch que detectó el test automatizado.</p>
    <div style="background:var(--surface);border-radius:var(--radius-lg);padding:20px;box-shadow:var(--shadow);margin-bottom:16px">
      <div style="display:flex;gap:16px;flex-wrap:wrap">
        <div style="flex:1;min-width:200px">
          <div style="font-size:2em;font-weight:800;color:var(--accent);margin-bottom:4px">1</div>
          <strong>Iniciá sesión como admin</strong>
          <p class="dim" style="font-size:0.85em;margin-top:4px">Entrá a ${esc(results.allureUrl.replace('/allure/', '').replace('https://', '') || 'campus.aulavirtual.unc.edu.ar')} con tu usuario.</p>
        </div>
        <div style="flex:1;min-width:200px">
          <div style="font-size:2em;font-weight:800;color:var(--accent);margin-bottom:4px">2</div>
          <strong>Andá al curso</strong>
          <p class="dim" style="font-size:0.85em;margin-top:4px">Navegá a <code>/course/view.php?id=${esc(courseId)}</code>. Vas a ver el curso completo como admin (todas las secciones visibles).</p>
        </div>
        <div style="flex:1;min-width:200px">
          <div style="font-size:2em;font-weight:800;color:var(--accent);margin-bottom:4px">3</div>
          <strong>Cambiá tu rol a "Estudiante"</strong>
          <p class="dim" style="font-size:0.85em;margin-top:4px">Menú de usuario (arriba a la derecha) → <strong>"Cambiar rol a..."</strong> → <strong>"Estudiante"</strong>.</p>
        </div>
      </div>
      <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:12px">
        <div style="flex:1;min-width:200px">
          <div style="font-size:2em;font-weight:800;color:var(--accent);margin-bottom:4px">4</div>
          <strong>Ahora fijate en las secciones</strong>
          <p class="dim" style="font-size:0.85em;margin-top:4px">
            ${lockedSection ? `La sección <strong>"${esc(lockedSection.title)}"</strong> que antes veías ahora está bloqueada o invisible. Coincide con el reporte de abajo.` : 'Las secciones marcadas en el reporte son las que cambiaron.'}
          </p>
        </div>
        <div style="flex:1;min-width:200px">
          <div style="font-size:2em;font-weight:800;color:var(--accent);margin-bottom:4px">5</div>
          <strong>Comprobá con el reporte</strong>
          <p class="dim" style="font-size:0.85em;margin-top:4px">En la sección <strong>"Vista lado a lado"</strong> de esta página, compará lo que ves como admin vs. lo que ves como estudiante. Los screenshots son evidencia.</p>
        </div>
        <div style="flex:1;min-width:200px">
          <div style="font-size:2em;font-weight:800;color:var(--accent);margin-bottom:4px">6</div>
          <strong>Revertí el cambio de rol</strong>
          <p class="dim" style="font-size:0.85em;margin-top:4px">Menú de usuario → "Cambiar rol a..." → "Rol por defecto (Admin)". Así volvés a tu vista normal.</p>
        </div>
      </div>
    </div>
    <p style="font-size:0.85em;color:var(--text-2);margin-bottom:24px">💡 Este mismo proceso es el que ejecuta el test automatizado en cada push. La diferencia es que el test lo hace en segundos y genera este reporte automáticamente.</p>
    <div class="dev-note">
      <strong>⚠️ Entorno de pruebas en producción</strong><br>
      Esta auditoría se ejecuta sobre el entorno productivo de Moodle. Los resultados pueden incluir hallazgos ya conocidos o en proceso de corrección.
    </div>

    <div class="dev-note" style="margin-top:12px;background:#cce5ff;border-color:#0d6efd">
      <strong>🔄 Mejora: estudiantes frescos en cada corrida</strong><br>
      Desde julio 2026, el pipeline crea un usuario nuevo vía API, lo enrola en el curso, ejecuta la auditoría como ese estudiante, y lo elimina al terminar. Esto reemplaza el approach anterior que usaba un usuario estático (nelthor).<br><br>
      <strong>🧪 ¿Por qué es importante?</strong> Nelthor fue promovido a administrador, por lo que su vista del curso ya no reflejaba la experiencia de un estudiante real. Esto podía generar falsos negativos: por ejemplo, el Módulo 3 de Python 1 aparecía bloqueado para nelthor (admin con role switch) pero la causa real solo se confirmó al usar un estudiante fresco.<br><br>
      <strong>👤 Estado de nelthor:</strong> Sigue siendo un usuario enrolado en Python 1 y su progresión en el curso sigue siendo válida. Usando cambio de rol o navegación directa desde su cuenta admin, aún puede acceder a su progreso histórico y completar actividades pendientes.
    </div>`
  }

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Campus Virtual - ${esc(courseName)}</title>
  <style>
    :root {
      --bg: #f8f9fa;
      --surface: #ffffff;
      --border: #dee2e6;
      --text: #212529;
      --text-2: #6c757d;
      --accent: #0d6efd;
      --good: #198754;
      --warn: #ffc107;
      --bad: #dc3545;
      --radius: 8px;
      --radius-lg: 12px;
      --shadow: 0 1px 3px rgba(0,0,0,.12);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
    }
    .header {
      background: linear-gradient(135deg, #1a237e 0%, #283593 100%);
      color: #fff;
      padding: 32px 24px;
      text-align: center;
    }
    .header h1 { font-size: 1.6em; font-weight: 700; margin-bottom: 4px; }
    .subtitle { font-size: 0.9em; opacity: .8; }
    .meta { font-size: 0.8em; opacity: .6; margin-top: 8px; }
    .container { max-width: 960px; margin: 0 auto; padding: 24px 16px; }
    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 24px; }
    .card {
      background: var(--surface);
      border-radius: var(--radius-lg);
      padding: 20px;
      text-align: center;
      box-shadow: var(--shadow);
    }
    .card .num { font-size: 2.2em; font-weight: 800; line-height: 1.2; }
    .card .label { font-size: 0.8em; color: var(--text-2); margin-top: 4px; }
    .card.critical .num { color: var(--bad); }
    .card.warning .num { color: var(--good); }
    .card.accent .num { color: var(--accent); }
    .section-title {
      font-size: 1.15em;
      font-weight: 700;
      margin: 24px 0 12px;
      padding-bottom: 8px;
      border-bottom: 2px solid var(--border);
    }
    .finding {
      background: var(--surface);
      border-radius: var(--radius);
      margin-bottom: 8px;
      box-shadow: var(--shadow);
      border-left: 4px solid var(--border);
      overflow: hidden;
    }
    .finding.critical { border-left-color: var(--bad); }
    .finding.warning { border-left-color: var(--warn); }
    .finding.info { border-left-color: var(--accent); }
    .finding-header {
      padding: 12px 16px;
      display: flex;
      align-items: flex-start;
      gap: 8px;
      cursor: pointer;
    }
    .finding-header .icon { flex-shrink: 0; font-size: 1.1em; }
    .finding-header .msg { flex: 1; font-size: 0.9em; }
    .chevron { font-size: 0.8em; color: var(--text-2); transition: transform .2s; }
    .finding.open .chevron { transform: rotate(90deg); }
    .finding-detail {
      padding: 0 16px 12px 36px;
      font-size: 0.85em;
      color: var(--text-2);
      display: none;
      line-height: 1.5;
    }
    .finding.open .finding-detail { display: block; }
    .screenshot {
      margin: 12px;
      border-radius: var(--radius);
      border: 1px solid var(--border);
      overflow: hidden;
    }
    .screenshot img { width: 100%; display: block; }
    .screenshot .caption {
      padding: 8px 12px;
      font-size: 0.8em;
      color: var(--text-2);
      background: var(--bg);
    }
    table.compact {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85em;
      background: var(--surface);
      border-radius: var(--radius);
      overflow: hidden;
      box-shadow: var(--shadow);
    }
    table.compact th {
      text-align: left;
      padding: 10px 12px;
      background: #f1f3f5;
      border-bottom: 2px solid var(--border);
      font-weight: 600;
    }
    table.compact td { padding: 8px 12px; border-bottom: 1px solid var(--border); }
    table.compact tr:last-child td { border-bottom: none; }
    .actions {
      display: flex;
      gap: 12px;
      justify-content: center;
      flex-wrap: wrap;
      margin: 24px 0;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 12px 24px;
      border-radius: var(--radius);
      font-weight: 600;
      font-size: 0.9em;
      text-decoration: none;
      transition: opacity .2s;
    }
    .btn-primary { background: var(--accent); color: #fff; }
    .btn-outline { background: transparent; color: var(--accent); border: 2px solid var(--accent); }
    .btn:hover { opacity: .85; }
    .badge-api { display: inline-block; padding: 2px 8px; border-radius: 4px; background: #6f42c1; color: #fff; font-size: 0.75em; font-weight: 600; margin-right: 6px; text-transform: uppercase; }
    .badge-ui { display: inline-block; padding: 2px 8px; border-radius: 4px; background: #0d6efd; color: #fff; font-size: 0.75em; font-weight: 600; margin-right: 6px; text-transform: uppercase; }
    .badge-srv { display: inline-block; padding: 2px 8px; border-radius: 4px; background: #6f42c1; color: #fff; font-size: 0.75em; font-weight: 600; margin-right: 6px; text-transform: uppercase; }
    .dev-note {
      margin-top: 32px;
      padding: 16px;
      background: #fff3cd;
      border-radius: var(--radius);
      font-size: 0.85em;
      border: 1px solid #ffc107;
    }
    .dev-note strong { color: #856404; }
    .footer {
      text-align: center;
      padding: 24px;
      font-size: 0.8em;
      color: var(--text-2);
    }
    .no-findings {
      text-align: center;
      padding: 40px;
      background: var(--surface);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow);
    }
    .no-findings .emoji { font-size: 3em; margin-bottom: 12px; }
    .no-findings h3 { margin-bottom: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📋 Campus Virtual - ${esc(courseName)}</h1>
    <div class="subtitle">Reporte de Auditoría de Curso</div>
    <div class="meta">Curso ID: ${esc(courseId)} · Auditado el ${date}</div>
  </div>

  <div class="container">
    <div class="cards">
      <div class="card critical">
        <div class="num">${criticalCount}</div>
        <div class="label">🔴 Críticos</div>
      </div>
      <div class="card warning">
        <div class="num">${warningCount}</div>
        <div class="label">🟡 Advertencias</div>
      </div>
      <div class="card accent">
        <div class="num">${infoCount}</div>
        <div class="label">🔵 Informativos</div>
      </div>
      <div class="card ${lockedSections > 0 ? 'critical' : 'good'}">
        <div class="num">${lockedSections}/${totalSections}</div>
        <div class="label">🔒 Secciones bloqueadas</div>
      </div>
    </div>

    <div class="actions">
      <a href="${triggerUrl}" target="_blank" rel="noopener" class="btn btn-primary">🔄 Ejecutar nueva auditoría</a>
      <a href="${allureUrl}" target="_blank" rel="noopener" class="btn btn-outline">🔍 Ver reporte técnico (Allure)</a>
    </div>

    ${resolvedHTML}

    ${unifiedHTML}

    ${dbProbesHTML}

    ${progressionHTML}

    ${compareHTML}

    ${caveatsHTML}

    ${devNote}

    <div class="footer">
      <p><a href="https://nelthor.com.ar" target="_blank" rel="noopener" style="color:var(--text-2);text-decoration:underline">Nahuel Gomez</a> · QA Engineer — UNC Campus Virtual</p>
      <p style="margin-top:4px"><a href="${triggerUrl}" target="_blank" rel="noopener">Ejecutar nueva auditoría →</a></p>
    </div>
  </div>
</body>
</html>`
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function main(): void {
  const args = process.argv.slice(2)
  const resultsPath = resolve(args[0] || 'reports/audit/audit-results.json')
  const screenshotDir = resolve(args[1] || 'reports/audit')
  const outputDir = resolve(args[2] || 'audit-report')
  const allureUrl = '/unc-agentic-dev/allure/'
  const apiResultsIdx = args.indexOf('--api-results')
  const apiResultsPath = apiResultsIdx !== -1 ? resolve(args[apiResultsIdx + 1]) : null

  let apiResults: ApiAuditResults | null = null
  if (apiResultsPath && existsSync(apiResultsPath)) {
    try {
      apiResults = loadJson<ApiAuditResults>(apiResultsPath)
      console.log(`✅ API audit results loaded: ${apiResults.apiFindings.length} findings`)
    } catch (err) {
      console.warn('⚠️ Failed to load API audit results:', err instanceof Error ? err.message : err)
    }
  }

  const runUrl =
    process.env.GITHUB_SERVER_URL != null &&
    process.env.GITHUB_SERVER_URL !== '' &&
    process.env.GITHUB_REPOSITORY != null &&
    process.env.GITHUB_REPOSITORY !== '' &&
    process.env.GITHUB_RUN_ID != null &&
    process.env.GITHUB_RUN_ID !== ''
      ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
      : ''

  let results: AuditResults
  if (existsSync(resultsPath)) {
    results = {
      ...loadJson<AuditResults>(resultsPath),
      runUrl,
      allureUrl,
      screenshots: loadScreenshots(screenshotDir),
    }
  } else if (apiResults) {
    console.log('⚠️ UI audit results not found — generating API-only report')
    results = {
      courseId: apiResults.courseId,
      courseName: apiResults.courseName,
      timestamp: apiResults.timestamp,
      runUrl,
      allureUrl,
      adminView: { courseName: apiResults.courseName, courseUrl: '', tabs: [], sections: [] },
      teacherView: { courseName: apiResults.courseName, courseUrl: '', tabs: [], sections: [] },
      studentView: { courseName: apiResults.courseName, courseUrl: '', tabs: [], sections: [] },
      findings: [],
      screenshots: [],
    }
  } else {
    console.error(
      `❌ No audit results found. Need either UI results at ${resultsPath} or API results at ${apiResultsPath}`,
    )
    process.exit(1)
  }

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true })
  }

  const html = buildHTML(results, apiResults)
  writeFileSync(resolve(outputDir, 'index.html'), html, 'utf-8')
  console.log(`✅ Reporte de auditoría generado: ${resolve(outputDir, 'index.html')}`)
}

main()
