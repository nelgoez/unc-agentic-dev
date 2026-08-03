import type { AuditData } from './buildAuditData'

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function generateAuditHtml(data: AuditData): string {
  const d = data

  const statCards = `
    <div class="stat-card stat-critical"><div class="stat-number">${d.criticalCount}</div><div class="stat-label">Criticos</div></div>
    <div class="stat-card stat-warning"><div class="stat-number">${d.warningCount}</div><div class="stat-label">Advertencias</div></div>
    <div class="stat-card stat-info"><div class="stat-number">${d.infoCount}</div><div class="stat-label">Info</div></div>
    <div class="stat-card"><div class="stat-number">${d.sections}</div><div class="stat-label">Secciones</div></div>
    <div class="stat-card"><div class="stat-number">${d.totalActivities}</div><div class="stat-label">Actividades</div></div>
  `

  const badgeColor = d.criticalCount > 0 ? '#dc2626' : d.warningCount > 0 ? '#f59e0b' : '#16a34a'

  const metricsRows = [
    ['Secciones', String(d.sections)],
    ['Actividades', String(d.totalActivities)],
    ['Actividades con restricciones', String(d.restrictedActivities)],
    ['Completion automatico', String(d.completionAuto)],
    ['Completion manual', String(d.completionManual)],
    ['Sin completion tracking', String(d.completionNone)],
  ]
  if (d.hasDocs) {
    metricsRows.push(['Doc actividades', String(d.docTotal)])
    metricsRows.push([
      'Doc mapeadas a prod',
      `${d.docMatched} (${d.docTotal > 0 ? Math.round((d.docMatched / d.docTotal) * 100) : 0}%)`,
    ])
  }

  let html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>QA Audit: ${esc(d.courseName)} (${d.courseId}) — ${d.timestamp}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f1f5f9;color:#1e293b;padding:24px}
.container{max-width:960px;margin:0 auto}
.header{background:#fff;border-radius:12px;padding:28px 32px;margin-bottom:24px;box-shadow:0 1px 3px rgba(0,0,0,0.1)}
.header h1{font-size:1.4em;margin-bottom:4px;color:#0f172a}
.header .sub{color:#64748b;font-size:.85em;margin-bottom:16px}
.status-badge{display:inline-block;padding:5px 14px;border-radius:20px;font-weight:600;font-size:.82em;color:#fff;background:${badgeColor};margin-bottom:12px}
.stats-row{display:flex;gap:12px;margin:12px 0}
.stat-card{background:#f8fafc;border-radius:8px;padding:12px 16px;flex:1;text-align:center;min-width:0}
.stat-card .stat-number{font-size:1.6em;font-weight:700}
.stat-card .stat-label{font-size:.75em;color:#64748b;margin-top:4px}
.stat-critical .stat-number{color:#dc2626}
.stat-warning .stat-number{color:#f59e0b}
.stat-info .stat-number{color:#3b82f6}
.section{background:#fff;border-radius:12px;padding:24px;margin-bottom:20px;box-shadow:0 1px 3px rgba(0,0,0,0.1)}
.section h2{font-size:1.1em;margin-bottom:14px;padding-bottom:8px;border-bottom:2px solid #e2e8f0}
.conf-badge{font-size:.75em;padding:2px 8px;border-radius:10px;font-weight:500;margin-left:8px}
.conf-locked{background:#f0fdf4;color:#16a34a}
.conf-docs{background:#fffbeb;color:#d97706}
table{width:100%;border-collapse:collapse;margin-bottom:12px;font-size:.88em}
th{text-align:left;padding:8px 12px;background:#f8fafc;border-bottom:2px solid #e2e8f0;font-weight:600;color:#475569}
td{padding:7px 12px;border-bottom:1px solid #f1f5f9}
.finding{display:flex;gap:10px;padding:10px 12px;border-radius:8px;margin-bottom:6px;font-size:.85em}
.finding-critical{background:#fef2f2;border:1px solid #fecaca}
.finding-warning{background:#fffbeb;border:1px solid #fde68a}
.finding-info{background:#eff6ff;border:1px solid #bfdbfe}
.finding-icon{font-size:1.1em;flex-shrink:0}
.finding-title{font-weight:600;margin-bottom:2px}
.callout{background:#f8fafc;border-left:3px solid #64748b;padding:10px 14px;margin:10px 0;font-size:.85em;color:#475569;border-radius:0 6px 6px 0}
.orphan-callout{background:#fef2f2;border-left-color:#dc2626}
details{margin:8px 0}
summary{cursor:pointer;font-weight:600;font-size:.88em;color:#475569}
summary:hover{color:#1e293b}
details .detail-content{background:#f8fafc;border-radius:6px;padding:10px 14px;margin-top:6px;font-size:.83em;color:#64748b;max-height:200px;overflow-y:auto}
.confidence-bar{display:flex;align-items:center;gap:10px;margin:8px 0;font-size:.82em}
.bar-track{flex:1;height:6px;background:#e2e8f0;border-radius:3px;overflow:hidden}
.bar-fill{height:100%;border-radius:3px}
.bar-fill.locked{background:#16a34a;width:100%}
.bar-fill.docs{background:#f59e0b;width:${d.hasDocs ? Math.round((d.docMatched / Math.max(d.docTotal, 1)) * 100) : 10}%}
.nav-link{display:inline-block;color:#3b82f6;text-decoration:none;font-size:.82em;margin-bottom:16px}
.nav-link:hover{text-decoration:underline}
.rerun-btn{display:inline-block;padding:8px 18px;border-radius:8px;background:#f8fafc;border:1px solid #e2e8f0;color:#475569;cursor:pointer;font-weight:500;font-size:.85em;transition:all .2s}
.rerun-btn:hover{background:#eff6ff;border-color:#3b82f6;color:#3b82f6}
.rerun-btn:disabled{opacity:.5;cursor:not-allowed}
.rerun-msg{display:inline-block;margin-left:10px;font-size:.82em;padding:4px 10px;border-radius:6px}
.rerun-msg.ok{background:#f0fdf4;color:#16a34a}
.rerun-msg.err{background:#fef2f2;color:#dc2626}
.tech-section details{margin:6px 0}
.tech-section summary{font-weight:600;font-size:.83em;padding:6px 0;color:#334155}
.tag{display:inline-block;padding:1px 6px;border-radius:4px;font-size:.72em;font-weight:500}
.tag-auto{background:#f0fdf4;color:#16a34a}
.tag-manual{background:#fefce8;color:#ca8a04}
.tag-none{background:#f1f5f9;color:#64748b}
.tag-visible{background:#f0fdf4;color:#16a34a}
.tag-hidden{background:#fef2f2;color:#dc2626}
.raw-json{background:#1e293b;color:#e2e8f0;padding:10px 14px;border-radius:6px;font-size:.75em;overflow-x:auto;white-space:pre-wrap;word-break:break-all;max-height:300px;overflow-y:auto}.footer{text-align:center;color:#94a3b8;font-size:.78em;margin-top:28px;padding-top:14px;border-top:1px solid #e2e8f0}
</style>
<script>
async function reRunAudit() {
  const btn = document.getElementById('rerun-btn');
  const msg = document.getElementById('rerun-msg');
  btn.disabled = true;
  msg.textContent = 'Disparando...';
  msg.className = 'rerun-msg';
  try {
    const res = await fetch('https://unc-course-kit.netlify.app/api/trigger-audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId: ${d.courseId}, courseName: "${esc(d.courseName).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}" })
    });
    const data = await res.json();
    if (data.ok) {
      msg.textContent = 'Auditoria disparada. Refresca en 2-3 min.';
      msg.className = 'rerun-msg ok';
    } else {
      msg.textContent = data.error || 'Error al disparar';
      msg.className = 'rerun-msg err';
    }
  } catch(e) {
    msg.textContent = 'Error de conexion';
    msg.className = 'rerun-msg err';
  }
  btn.disabled = false;
}
</script>
</head>
<body>
<div class="container">
<a href="../" class="nav-link">\u2190 Volver al indice</a>

<div class="header">
<div class="status-badge">${esc(d.badge)}</div>
<h1>${esc(d.courseName)} (${d.courseId})</h1>
<div class="sub">
  <p>Fecha: ${d.timestamp}</p>
  <p>Confianza general: ${d.docsConfidence}</p>
  <p style="margin-top:10px">
    <button class="rerun-btn" id="rerun-btn" onclick="reRunAudit()">Re-ejecutar auditoria</button>
    <span id="rerun-msg"></span>
  </p>
</div>
<div class="stats-row">${statCards}</div>
</div>

<div class="section">
<h2>Metricas</h2>
<table>
<thead><tr><th>Metrica</th><th>Valor</th></tr></thead>
<tbody>
${metricsRows.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('\n')}
</tbody>
</table>
</div>

<div class="section">
<h2>Estructura <span class="conf-badge conf-locked">100% confiable</span></h2>
<table>
<thead><tr><th>#</th><th>Seccion</th><th>Actividades</th></tr></thead>
<tbody>
${d.breakdown.sections.map((s) => `<tr><td>${s.section}</td><td>${esc(s.name)}</td><td>${s.moduleCount}</td></tr>`).join('\n')}
</tbody>
</table>
<div class="confidence-bar">
  <span>Confianza:</span>
  <div class="bar-track"><div class="bar-fill locked"></div></div>
  <span>Datos directos de API Moodle</span>
</div>
</div>`

  if (d.gatesFound.length > 0) {
    html += `
<div class="section">
<h2>Puertas / Gates <span class="conf-badge conf-locked">100% confiable</span></h2>
<table>
<thead><tr><th>Actividad restringida</th><th>Requiere</th></tr></thead>
<tbody>
${d.gatesFound.map((g) => `<tr><td>${esc(g.module)}</td><td>${esc(g.description)}</td></tr>`).join('\n')}
</tbody>
</table>
<div class="confidence-bar">
  <span>Confianza:</span>
  <div class="bar-track"><div class="bar-fill locked"></div></div>
  <span>Datos directos de API Moodle</span>
</div>
</div>`
  }

  html += `
<div class="section">
<h2>Completion Tracking <span class="conf-badge conf-locked">100% confiable</span></h2>
<table>
<thead><tr><th>Estado</th><th>Cantidad</th></tr></thead>
<tbody>
<tr><td>Automatico (completion=2)</td><td>${d.completionAuto}</td></tr>
<tr><td>Manual (completion=1)</td><td>${d.completionManual}</td></tr>
<tr><td>Sin tracking (completion=0)</td><td>${d.completionNone}</td></tr>
</tbody>
</table>
</div>`

  if (d.certModules.length > 0) {
    html += `
<div class="section">
<h2>Certificados y condiciones <span class="conf-badge conf-locked">100% confiable</span></h2>
<table>
<thead><tr><th>Certificado</th><th>Condiciones</th></tr></thead>
<tbody>
${d.certModules.map((c) => `<tr><td><strong>${esc(c.name)}</strong></td><td>${esc(c.description)}</td></tr>`).join('\n')}
</tbody>
</table>
</div>`
  }

  if (d.orphans.length > 0) {
    html += `
<div class="section">
<h2>Huerfanos <span class="conf-badge conf-locked">100% confiable</span></h2>
${d.orphans.map((o) => `<div class="finding finding-critical"><div class="finding-icon">\u{1F534}</div><div><div class="finding-title">cmid ${o.cmid} no existe</div><div>Referenciado por: ${esc(o.moduleName || '-')} en "${esc(o.sectionName)}"</div></div></div>`).join('\n')}
<div class="callout orphan-callout">Actividades referenciadas como gate que no existen en el curso. Suelen ser actividades eliminadas cuya restriccion persiste en la base de datos.</div>
</div>`
  }

  if (d.gatesWithE0orE3.length > 0) {
    html += `
<div class="section">
<h2>Advertencias <span class="conf-badge conf-locked">100% confiable</span></h2>
${d.gatesWithE0orE3.map((g) => `<div class="finding finding-warning"><div class="finding-icon">\u26A0\uFE0F</div><div><div class="finding-title">${esc(g)}</div></div></div>`).join('\n')}
<div class="callout">e=0 requiere que la actividad este INCOMPLETA. e=3 requiere que este COMPLETA Y SUSPENSA. Verificar que sea intencional.</div>
</div>`
  }

  if (
    d.hasDocs &&
    d.reconciliation.matched.length +
      d.reconciliation.docOnly.length +
      d.reconciliation.prodOnly.length >
      0
  ) {
    const docMatchPct = Math.round((d.docMatched / Math.max(d.docTotal, 1)) * 100)
    html += `
<div class="section">
<h2>Doc vs Produccion <span class="conf-badge conf-docs">depende de docs</span></h2>
<div class="confidence-bar">
  <span>Mapeo:</span>
  <div class="bar-track"><div class="bar-fill docs"></div></div>
  <span>${d.docMatched}/${d.docTotal} (${docMatchPct}%)</span>
</div>`

    if (d.reconciliation.matched.length > 0) {
      html += `
<table>
<thead><tr><th></th><th>Documentacion</th><th>Produccion (cmid)</th><th>Score</th></tr></thead>
<tbody>
${d.reconciliation.matched
  .map((m) => {
    const icon = m.score >= 80 ? '\u2705' : m.score >= 60 ? '\uD83D\uDFE1' : '\u26A0\uFE0F'
    return `<tr><td>${icon}</td><td>${esc(m.docName)}</td><td>${esc(m.prodName)} (${m.prodId})</td><td>${m.score}%</td></tr>`
  })
  .join('\n')}
</tbody>
</table>`
    }

    if (d.reconciliation.docOnly.length > 0) {
      html += `
<details>
<summary>Solo en docs (${d.reconciliation.docOnly.length})</summary>
<div class="detail-content">${esc(d.reconciliation.docOnly.join(', '))}</div>
</details>`
    }

    if (d.reconciliation.prodOnly.length > 0) {
      html += `
<div class="callout"><strong>Solo en produccion (${d.reconciliation.prodOnly.length}):</strong> ${esc(d.reconciliation.prodOnly.map((p) => `${p.name} (${p.id})`).join(', '))}</div>`
    }

    html += `
<div class="callout">Esta seccion depende de la calidad de los documentos. Nombres ambiguos o faltantes reducen la precision del mapeo.</div>
</div>`
  }

  html += `
<div class="section">
<h2>Limitaciones</h2>
${
  d.hasDocs
    ? '<p style="font-size:.9em;color:#475569">El mapeo doc\u2194produccion usa fuzzy matching. Nombres muy distintos entre docs y Moodle pueden generar falsos negativos.</p>'
    : '<p style="font-size:.9em;color:#475569">Sin documentos de entrada: no se puede hacer mapeo doc\u2194produccion. Solo se reporta lo visible desde la API.</p>'
}
<p style="font-size:.9em;color:#475569;margin-top:6px">Las condiciones de nota requieren verificacion manual de que el item de calificacion exista.</p>
<p style="font-size:.9em;color:#475569;margin-top:6px">Este reporte usa solo la API de Moodle. No incluye verificacion visual (UI/Playwright).</p>
</div>

<div class="section tech-section">
<h2>Detalles tecnicos</h2>
${buildTechnicalDetails(d)}
</div>

<div class="footer">
Generado automaticamente por UNC QA Audit &mdash; ${d.timestamp}
</div>
</div>
</body>
</html>`

  return html
}

function buildTechnicalDetails(d: AuditData): string {
  const allMods: Array<{
    section: string
    id: number
    name: string
    modname: string
    completion: number
  }> = []
  for (const s of d.breakdown.sections) {
    for (const m of s.modules) {
      const mod = d.allModules.get(m.id)
      allMods.push({
        section: `Sec ${s.section}: ${s.name}`,
        id: m.id,
        name: mod?.name || m.name,
        modname: mod?.type || '',
        completion: m.completion,
      })
    }
  }

  let html =
    '<details><summary><strong>Catalogo completo de actividades</strong> (' +
    allMods.length +
    ' actividades, cmid, tipo, completion)</summary>'
  html +=
    '<table class="cm-table"><thead><tr><th>cmid</th><th>Nombre</th><th>Tipo</th><th>Completion</th><th>Seccion</th></tr></thead><tbody>'
  for (const m of allMods) {
    const compTag =
      m.completion === 2
        ? '<span class="tag tag-auto">auto</span>'
        : m.completion === 1
          ? '<span class="tag tag-manual">manual</span>'
          : '<span class="tag tag-none">sin tracking</span>'
    html += `<tr><td class="mono">${m.id}</td><td>${esc(m.name)}</td><td>${esc(m.modname)}</td><td>${compTag}</td><td style="font-size:.75em;color:#64748b">${esc(m.section)}</td></tr>`
  }
  html += '</tbody></table></details>'

  const restrictedWithJson: Array<{ name: string; rawJson: string }> = []
  for (const s of d.breakdown.sections) {
    for (const mr of s.modulesWithRestrictions) {
      if (mr.conditions.length > 0) {
        restrictedWithJson.push({
          name: mr.name,
          rawJson: JSON.stringify(mr.conditions, null, 2),
        })
      }
    }
  }

  if (restrictedWithJson.length > 0) {
    html +=
      '<details style="margin-top:8px"><summary><strong>Restricciones de disponibilidad</strong> (JSON crudo, ' +
      restrictedWithJson.length +
      ' actividades)</summary>'
    for (const r of restrictedWithJson) {
      html += `<p style="margin:6px 0;font-size:.8em"><strong>${esc(r.name)}:</strong></p>`
      html += `<pre class="raw-json">${esc(r.rawJson)}</pre>`
    }
    html += '</details>'
  }

  if (d.orphans.length > 0) {
    html +=
      '<details style="margin-top:8px"><summary><strong>Huerfanos detectados</strong> (cmid inexistentes)</summary>'
    html +=
      '<table><thead><tr><th>cmid</th><th>Referenciado por</th><th>Seccion</th></tr></thead><tbody>'
    for (const o of d.orphans) {
      html += `<tr><td class="mono">${o.cmid}</td><td>${esc(o.moduleName || '-')}</td><td>${esc(o.sectionName)}</td></tr>`
    }
    html += '</tbody></table></details>'
  }

  return html
}
