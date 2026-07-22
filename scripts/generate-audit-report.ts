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
  breakdown: { sections: unknown[]; totalActivities: number; restrictedActivities: number }
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

  let findingsHTML = ''
  if (findings.length === 0) {
    findingsHTML = `<div class="no-findings"><div class="emoji">✅</div><h3>No se encontraron incidencias</h3><p class="dim">El curso supera la auditoría sin hallazgos críticos ni advertencias.</p></div>`
  } else {
    findingsHTML = `<h2 class="section-title">Hallazgos de la auditoría</h2>`
    for (const f of findings) {
      const si = severityInfo(f.severity)
      const stuScreenshot = screenshotMap.get(`student|${f.sectionNumber}`)
      findingsHTML += `
    <div class="finding ${f.severity}" onclick="this.classList.toggle('open')">
      <div class="finding-header">
        <span class="icon">${si.icon}</span>
        <span class="msg"><strong>${esc(f.sectionTitle)}:</strong> ${esc(f.message)}</span>
        <span class="chevron">▶</span>
      </div>
      <div class="finding-detail">${esc(f.detail)}</div>`
      if (stuScreenshot != null && stuScreenshot !== '') {
        findingsHTML += `
      <div class="screenshot">
        <img src="data:image/png;base64,${stuScreenshot}" alt="Captura sección ${f.sectionNumber}">
        <div class="caption">📸 Vista como estudiante - Sección ${f.sectionNumber}: ${esc(f.sectionTitle)}</div>
      </div>`
      }
      findingsHTML += `\n    </div>`
    }
    findingsHTML += `\n    <p style="margin-top:8px;font-size:0.8em;color:var(--text-2)">💡 Hacé clic en cada hallazgo para ver detalle y captura.</p>`
  }

  // API audit findings section
  let apiFindingsHTML = ''
  if (apiResults && apiResults.apiFindings.length > 0) {
    apiFindingsHTML = `<h2 class="section-title">🔍 Hallazgos de la capa API</h2>
    <p style="font-size:0.85em;color:var(--text-2);margin-bottom:12px">Análisis estructural vía REST API — disponibilidad JSON, actividades fantasma, condiciones de acceso.</p>`
    for (const f of apiResults.apiFindings) {
      const si = severityInfo(f.severity)
      apiFindingsHTML += `
      <div class="finding ${f.severity}" onclick="this.classList.toggle('open')">
        <div class="finding-header">
          <span class="icon">${si.icon}</span>
          <span class="msg"><strong>${esc(f.section)}:</strong> ${esc(f.message)}</span>
          <span class="chevron">▶</span>
        </div>
        <div class="finding-detail"><span class="badge-api">API</span> ${esc(f.detail)}</div>
      </div>`
    }
  }

  // DB probes section
  let dbProbesHTML = ''
  if (apiResults?.dbProbes) {
    const dp = apiResults.dbProbes
    dbProbesHTML = `<h2 class="section-title">🔬 Sondas de base de datos</h2>`

    if (dp.enrollment) {
      dbProbesHTML += `<div class="finding info"><div class="finding-header"><span class="icon">👥</span><span class="msg"><strong>Inscripciones:</strong> ${dp.enrollment.total} usuarios (${dp.enrollment.students} estudiantes, ${dp.enrollment.teachers} docentes)</span></div></div>`
    } else {
      dbProbesHTML += `<div class="finding info"><div class="finding-header"><span class="icon">👥</span><span class="msg"><strong>Inscripciones:</strong> Datos no disponibles — función no agregada al servicio</span></div></div>`
    }
    if (dp.gradeItems) {
      dbProbesHTML += `<div class="finding info"><div class="finding-header"><span class="icon">📊</span><span class="msg"><strong>Items de calificación:</strong> ${dp.gradeItems.total} items</span></div></div>`
    } else {
      dbProbesHTML += `<div class="finding info"><div class="finding-header"><span class="icon">📊</span><span class="msg"><strong>Items de calificación:</strong> Datos no disponibles — función no agregada al servicio</span></div></div>`
    }
    if (dp.cohorts) {
      dbProbesHTML += `<div class="finding info"><div class="finding-header"><span class="icon">👪</span><span class="msg"><strong>Cohortes:</strong> ${dp.cohorts.total} (${dp.cohorts.names.join(', ')})</span></div></div>`
    } else {
      dbProbesHTML += `<div class="finding info"><div class="finding-header"><span class="icon">👪</span><span class="msg"><strong>Cohortes:</strong> Datos no disponibles — función no agregada al servicio</span></div></div>`
    }
  }

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

    ${findingsHTML}

    ${apiFindingsHTML}

    ${dbProbesHTML}

    ${compareHTML}

    ${devNote}

    <div class="footer">
      <p>UNC Campus Virtual · Reporte generado automáticamente por el pipeline de auditoría</p>
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
  const allureUrl = args[3] || 'allure/'
  const apiResultsIdx = args.indexOf('--api-results')
  const apiResultsPath = apiResultsIdx !== -1 ? resolve(args[apiResultsIdx + 1]) : null

  if (!existsSync(resultsPath)) {
    if (apiResultsPath && existsSync(apiResultsPath)) {
      console.log('⚠️ UI audit results not found — generating API-only report')
    } else {
      console.error(
        `❌ No audit results found. Need either UI results at ${resultsPath} or API results at ${apiResultsPath}`,
      )
      process.exit(1)
    }
  }

  let apiResults: ApiAuditResults | null = null
  if (apiResultsPath && existsSync(apiResultsPath)) {
    try {
      apiResults = loadJson<ApiAuditResults>(apiResultsPath)
      console.log(`✅ API audit results loaded: ${apiResults.apiFindings.length} findings`)
    } catch (err) {
      console.warn('⚠️ Failed to load API audit results:', err instanceof Error ? err.message : err)
    }
  }

  const results: AuditResults = {
    ...loadJson<AuditResults>(resultsPath),
    runUrl:
      process.env.GITHUB_SERVER_URL != null &&
      process.env.GITHUB_SERVER_URL !== '' &&
      process.env.GITHUB_REPOSITORY != null &&
      process.env.GITHUB_REPOSITORY !== '' &&
      process.env.GITHUB_RUN_ID != null &&
      process.env.GITHUB_RUN_ID !== ''
        ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
        : '',
    allureUrl,
    screenshots: loadScreenshots(screenshotDir),
  }

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true })
  }

  const html = buildHTML(results, apiResults)
  writeFileSync(resolve(outputDir, 'index.html'), html, 'utf-8')
  console.log(`✅ Reporte de auditoría generado: ${resolve(outputDir, 'index.html')}`)
}

main()
