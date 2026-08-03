import { mkdirSync, writeFileSync, existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

interface ReportEntry {
  courseId: number
  courseName: string
  timestamp: string
  file: string
  htmlFile: string
  sections: number
  activities: number
  critical: number
  warnings: number
}

const REPORTS_ROOT = join(process.cwd(), 'reports', 'audit')
const INDEX_PATH = join(REPORTS_ROOT, 'index.html')

function collectReports(): ReportEntry[] {
  const entries: ReportEntry[] = []
  if (!existsSync(REPORTS_ROOT)) return entries

  const dirs = readdirSync(REPORTS_ROOT, { withFileTypes: true }).filter((d) => d.isDirectory())

  for (const dir of dirs) {
    const historyPath = join(REPORTS_ROOT, dir.name, 'history.json')
    if (!existsSync(historyPath)) continue

    try {
      const history: Array<{
        timestamp: string
        courseId: number
        courseName: string
        sections: number
        activities: number
        critical: number
        warnings: number
      }> = JSON.parse(readFileSync(historyPath, 'utf-8'))

      const courseDir = join(REPORTS_ROOT, dir.name)
      const files = readdirSync(courseDir).filter((f) => f.endsWith('.html'))

      for (const h of history) {
        const ts = new Date(h.timestamp)
        const pad = (n: number) => String(n).padStart(2, '0')
        const tsStr = `${ts.getFullYear()}-${pad(ts.getMonth() + 1)}-${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}`
        const mdFile = `${tsStr}.md`
        const htmlFile = `${tsStr}.html`

        entries.push({
          courseId: h.courseId,
          courseName: h.courseName,
          timestamp: h.timestamp,
          file: mdFile,
          htmlFile: files.includes(htmlFile) ? htmlFile : mdFile,
          sections: h.sections,
          activities: h.activities,
          critical: h.critical,
          warnings: h.warnings,
        })
      }
    } catch {
      continue
    }
  }

  entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  return entries
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function generateAuditIndex(): string {
  const reports = collectReports()

  const grouped = new Map<number, ReportEntry[]>()
  for (const r of reports) {
    if (!grouped.has(r.courseId)) grouped.set(r.courseId, [])
    grouped.get(r.courseId)!.push(r)
  }

  let rows = ''
  for (const [courseId, entries] of grouped) {
    const latest = entries[0]
    if (!latest) continue

    const badge =
      latest.critical > 0
        ? '<span style="background:#fef2f2;color:#dc2626;padding:2px 8px;border-radius:10px;font-size:.75em;font-weight:600">CRITICO</span>'
        : latest.warnings > 0
          ? '<span style="background:#fffbeb;color:#d97706;padding:2px 8px;border-radius:10px;font-size:.75em;font-weight:600">ADVERTENCIAS</span>'
          : '<span style="background:#f0fdf4;color:#16a34a;padding:2px 8px;border-radius:10px;font-size:.75em;font-weight:600">OK</span>'

    const date = new Date(latest.timestamp).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
    const time = new Date(latest.timestamp).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    })

    rows += `
    <tr>
      <td>${badge}</td>
      <td><a href="${courseId}/${latest.htmlFile}" style="color:#3b82f6;text-decoration:none;font-weight:500">${esc(latest.courseName)}</a></td>
      <td>${courseId}</td>
      <td>${date} ${time}</td>
      <td>${latest.sections}</td>
      <td>${latest.activities}</td>
      <td>${entries.length} ejecuciones</td>
      <td style="font-size:.78em">
        ${entries
          .slice(0, 3)
          .map((e, i) => {
            const d = new Date(e.timestamp).toLocaleDateString('es-AR', {
              day: '2-digit',
              month: '2-digit',
            })
            const h = new Date(e.timestamp).toLocaleTimeString('es-AR', {
              hour: '2-digit',
              minute: '2-digit',
            })
            return `<a href="${courseId}/${e.htmlFile}" style="color:${i === 0 ? '#3b82f6' : '#94a3b8'};text-decoration:none;margin-right:8px">${d} ${h}</a>`
          })
          .join('')}
        ${entries.length > 3 ? `<span style="color:#94a3b8">+${entries.length - 3} mas</span>` : ''}
      </td>
    </tr>`
  }

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>UNC QA Audit — Indice de Reportes</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f1f5f9;color:#1e293b;padding:24px}
.container{max-width:960px;margin:0 auto}
.header{background:#fff;border-radius:12px;padding:28px 32px;margin-bottom:24px;box-shadow:0 1px 3px rgba(0,0,0,0.1)}
.header h1{font-size:1.3em;margin-bottom:4px;color:#0f172a}
.header p{color:#64748b;font-size:.85em}
table{width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);font-size:.85em}
th{text-align:left;padding:10px 14px;background:#f8fafc;border-bottom:2px solid #e2e8f0;font-weight:600;color:#475569;font-size:.8em;text-transform:uppercase;letter-spacing:.5px}
td{padding:9px 14px;border-bottom:1px solid #f1f5f9}
tr:last-child td{border-bottom:none}
.empty{text-align:center;padding:40px;color:#94a3b8;font-size:.9em}
.action-bar{background:#fff;border-radius:12px;padding:20px 24px;margin-top:20px;box-shadow:0 1px 3px rgba(0,0,0,0.1);display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.action-bar p{color:#475569;font-size:.85em;flex:1;min-width:200px}
.action-bar a{display:inline-block;padding:8px 18px;border-radius:8px;text-decoration:none;font-weight:500;font-size:.85em;white-space:nowrap}
.btn-primary{background:#3b82f6;color:#fff}
.btn-primary:hover{background:#2563eb}
.btn-primary:disabled{opacity:.5;cursor:not-allowed}
.trigger-form{display:flex;gap:6px;align-items:center}
.trigger-form input{width:100px;padding:7px 10px;border:1px solid var(--border, #e2e8f0);border-radius:8px;font-size:.85em;font-family:inherit}
.trigger-msg{font-size:.78em;margin-left:8px}
.footer{text-align:center;color:#94a3b8;font-size:.78em;margin-top:28px;padding-top:14px;border-top:1px solid #e2e8f0}
</style>
</head>
<body>
<div class="container">
<div class="header">
<h1>UNC QA Audit</h1>
<p>Reportes de auditoria automatica de cursos Moodle. Cada ejecucion queda registrada para comparar avances.</p>
</div>
${
  reports.length === 0
    ? '<div class="empty"><p>No hay reportes todavia.</p><p style="margin-top:8px">Ejecuta <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px">bun run audit:curso &lt;courseId&gt; [docsDir]</code> para generar el primero.</p></div>'
    : `<table>
<thead><tr><th></th><th>Curso</th><th>ID</th><th>Ultima ejecucion</th><th>Secc</th><th>Act</th><th></th><th>Historial</th></tr></thead>
<tbody>${rows}</tbody>
</table>`
}
<div class="action-bar">
<p><strong>Actualizacion automatica:</strong> Todos los cursos se auditan semanalmente (lunes). Los reportes se actualizan solos.</p>
<div class="trigger-form">
  <input type="number" id="new-course-id" placeholder="ID del curso" min="1">
  <button class="btn-primary" onclick="triggerAudit()">Auditar ahora</button>
  <span class="trigger-msg" id="trigger-msg"></span>
</div>
</div>
<script>
async function triggerAudit() {
  const inp = document.getElementById('new-course-id');
  const btn = inp.nextElementSibling;
  const msg = document.getElementById('trigger-msg');
  const id = parseInt(inp.value);
  if (!id || id < 1) { msg.textContent = 'Ingresa un ID valido'; msg.style.color = '#dc2626'; return; }
  btn.disabled = true;
  msg.textContent = 'Disparando...';
  msg.style.color = '';
  try {
    const res = await fetch('https://unc-course-kit.netlify.app/api/trigger-audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId: id })
    });
    const data = await res.json();
    if (data.ok) { msg.textContent = 'Enviado! Visible en 2-3 min.'; msg.style.color='#16a34a'; }
    else { msg.textContent = data.error || 'Error'; msg.style.color='#dc2626'; }
  } catch(e) { msg.textContent = 'Error de conexion'; msg.style.color='#dc2626'; }
  btn.disabled = false;
}
</script>
<div class="footer">Generado automaticamente por UNC QA Audit</div>
</div>
</body>
</html>`
}

export function saveAuditIndex(): void {
  mkdirSync(REPORTS_ROOT, { recursive: true })
  writeFileSync(INDEX_PATH, generateAuditIndex(), 'utf-8')
}
