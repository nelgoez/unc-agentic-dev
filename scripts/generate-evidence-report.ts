import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const outDir = resolve('reports/informe')
mkdirSync(outDir, { recursive: true })

function imgToBase64(path: string): string {
  try {
    const buf = readFileSync(resolve(path))
    const ext = path.split('.').pop()?.toLowerCase() || 'png'
    const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png'
    return `data:${mime};base64,${buf.toString('base64')}`
  } catch {
    return ''
  }
}

const cursos = [
  {
    id: '269',
    nombre: 'Aprendiendo a caminar en Python - Certificación 1',
    modulos: '3 + Cierre',
    estado: 'CRÍTICO',
    resumen:
      'Actividad "Notebook Funcion-Lambda" referenciada en Módulo 3 pero inexistente. PDF suelto en Biblioteca.',
    criticos: 1,
    info: 6,
    problemaImg: 'reports/evidence/02-mod3-forced-click.png',
    solucionImg: 'reports/admin-explore/02-mod3-edit-mode.png',
    paso1: 'Ingresar al curso como admin → Activar edición',
    paso2: 'Ir a Módulo 3 → ver restricción en "Not available unless"',
    paso3: 'Buscar "Notebook Funcion-Lambda" en el curso — no existe como actividad',
    paso4: 'PDF en Biblioteca no es una actividad con finalización',
    fix1: 'Opción A: Crear actividad "Notebook Funcion-Lambda" con finalización habilitada en Módulo 2',
    fix2: 'Opción B: Quitar la restricción de Módulo 3 si no es necesaria',
    fixAdminUrl: 'https://campus.aulavirtual.unc.edu.ar/course/modedit.php?update=',
  },
]

const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Auditoría de Cursos — UNC Campus Virtual</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f1f5f9; color: #1e293b; padding: 24px; }
    .container { max-width: 960px; margin: 0 auto; }

    h1 { font-size: 1.5em; margin-bottom: 4px; color: #0f172a; }
    .subtitle { color: #64748b; font-size: 0.9em; margin-bottom: 24px; }

    .badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-weight: 700; font-size: 0.85em; color: white; }
    .badge-critical { background: #dc2626; }
    .badge-ok { background: #16a34a; }
    .badge-warning { background: #f59e0b; }

    .header-card { background: white; border-radius: 12px; padding: 24px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); text-align: center; }

    .card { background: white; border-radius: 12px; padding: 24px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .card h2 { font-size: 1.15em; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; display: flex; align-items: center; gap: 8px; }

    .badge-curso { background: #1e293b; color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.8em; }

    .problema { background: #fef2f2; border: 2px solid #fecaca; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
    .problema h3 { color: #dc2626; font-size: 1.1em; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
    .solucion { background: #f0fdf4; border: 2px solid #bbf7d0; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
    .solucion h3 { color: #16a34a; font-size: 1.1em; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }

    .step-list { list-style: none; counter-reset: step; }
    .step-list li { counter-increment: step; padding: 8px 0 8px 36px; position: relative; font-size: 0.9em; line-height: 1.5; color: #475569; }
    .step-list li::before { content: counter(step); position: absolute; left: 0; top: 8px; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8em; font-weight: 700; color: white; }
    .problema .step-list li::before { background: #dc2626; }
    .solucion .step-list li::before { background: #16a34a; }

    .screenshot { width: 100%; border-radius: 8px; border: 1px solid #e2e8f0; margin: 12px 0; }
    .screenshot-label { color: #64748b; font-size: 0.85em; text-align: center; margin-bottom: 12px; }

    .resumen-table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    .resumen-table th { text-align: left; padding: 10px 12px; background: #f8fafc; border-bottom: 2px solid #e2e8f0; font-weight: 600; color: #475569; font-size: 0.85em; }
    .resumen-table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 0.9em; }

    .info-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 14px; margin: 12px 0; font-size: 0.9em; color: #1e40af; line-height: 1.5; }

    .footer { text-align: center; color: #94a3b8; font-size: 0.8em; margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; }

    @media print {
      @page { margin: 12mm; size: A4; }
      body { background: white; padding: 0; font-size: 9pt; }
      .container { max-width: 100%; }
      .card, .problema, .solucion, .header-card { break-inside: avoid; box-shadow: none; border: 1px solid #e2e8f0; }
      .card { break-inside: auto; }
      .card h2 { break-after: avoid; }
      .screenshot { max-height: 120mm; object-fit: contain; }
      .problema, .solucion { break-inside: avoid; }
      .badge { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .problema, .solucion { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header-card">
      <h1>🧪 Auditoría Automatizada de Cursos</h1>
      <p class="subtitle">Campus Virtual UNC · ${new Date().toLocaleDateString('es-AR')}</p>
      <p style="color: #64748b; font-size: 0.85em; margin-top: 8px;">
        Esta herramienta escanea cursos de Moodle buscando actividades fantasma: 
        actividades que el sistema exige para avanzar pero que el estudiante no puede completar.
        Se genera automáticamente tras cada ejecución de pruebas.
      </p>
    </div>

    <div class="card">
      <h2>📊 Resumen de Cursos Auditados</h2>
      <table class="resumen-table">
        <tr><th>Curso</th><th>Módulos</th><th>Estado</th><th>Críticos</th><th>Info</th><th>Resumen</th></tr>
        ${cursos
          .map(
            (c) => `<tr>
          <td><strong>${c.nombre}</strong></td>
          <td>${c.modulos}</td>
          <td><span class="badge badge-${c.estado === 'CRÍTICO' ? 'critical' : 'ok'}">${c.estado}</span></td>
          <td style="color: ${c.criticos > 0 ? '#dc2626' : '#16a34a'}; font-weight: 700;">${c.criticos}</td>
          <td>${c.info}</td>
          <td style="font-size: 0.85em; color: #64748b;">${c.resumen}</td>
        </tr>`,
          )
          .join('')}
      </table>
    </div>

    ${cursos
      .map(
        (c) => `
    <div class="card">
      <h2><span class="badge-curso">Curso ${c.id}</span> ${c.nombre}</h2>

      <div class="problema">
        <h3>❌ Problema Detectado</h3>
        <p style="color: #475569; font-size: 0.9em; line-height: 1.5; margin-bottom: 12px;">
          <strong>${c.resumen}</strong>
        </p>
        <p style="color: #475569; font-size: 0.9em; margin-bottom: 8px;"><strong>Cómo reproducirlo (vista estudiante):</strong></p>
        <ol class="step-list">
          <li>${c.paso1}</li>
          <li>${c.paso2}</li>
          <li>${c.paso3}</li>
          <li>${c.paso4}</li>
        </ol>
        <p class="screenshot-label" style="margin-top: 12px;">Vista del Módulo 3 bloqueado desde el rol Estudiante:</p>
        <img class="screenshot" src="${imgToBase64(c.problemaImg)}" alt="Módulo 3 bloqueado" />
      </div>

      <div class="solucion">
        <h3>✅ Cómo Solucionarlo (vista admin/editor)</h3>
        <p style="color: #475569; font-size: 0.9em; line-height: 1.5; margin-bottom: 12px;">
          Hay dos formas de corregir este problema:
        </p>
        <p style="color: #475569; font-size: 0.9em; margin-bottom: 8px;"><strong>Opción A — Crear la actividad faltante:</strong></p>
        <ol class="step-list">
          <li>Ir al curso → Activar edición (toggle superior derecho)</li>
          <li>Ir a Módulo 2 → Agregar actividad → seleccionar "Archivo" o "Página"</li>
          <li>Poner como nombre: <strong>"Notebook Funcion-Lambda"</strong></li>
          <li>En "Seguimiento de finalización", marcar "Los estudiantes deben marcar como completada"</li>
          <li>Guardar cambios → la restricción de Módulo 3 se activará automáticamente</li>
        </ol>
        <p style="color: #475569; font-size: 0.9em; margin: 12px 0 8px;"><strong>Opción B — Quitar la restricción (si no es necesaria):</strong></p>
        <ol class="step-list">
          <li>Ir al curso → Activar edición</li>
          <li>Ir a Módulo 3 → editar configuración (engranaje)</li>
          <li>Buscar "Restricciones de acceso" → eliminar la condición de "Notebook Funcion-Lambda"</li>
          <li>Guardar cambios</li>
        </ol>
        <p class="screenshot-label" style="margin-top: 12px;">Vista del curso en modo edición (admin):</p>
        <img class="screenshot" src="${imgToBase64(c.solucionImg)}" alt="Modo edición admin" />
      </div>

      <div class="info-box">
        📌 <strong>Nota:</strong> Los ${c.info} hallazgos informativos del Cierre son consecuencia directa de este bloqueo.
        Se resuelven automáticamente al corregir la causa raíz. No requieren acción adicional.
      </div>
    </div>
    `,
      )
      .join('')}

    <div class="card">
      <h2>🔁 ¿Cómo se genera este reporte?</h2>
      <p style="color: #475569; font-size: 0.9em; line-height: 1.6;">
        Este reporte se genera automáticamente mediante el pipeline CI/CD del proyecto 
        <strong><code>unc-agentic-dev</code></strong>. Cada vez que se ejecutan las pruebas 
        de auditoría, se produce un reporte HTML con las capturas de pantalla embebidas.
      </p>
      <p style="color: #475569; font-size: 0.9em; line-height: 1.6; margin-top: 8px;">
        El flujo es:
      </p>
      <ol style="color: #475569; font-size: 0.9em; line-height: 1.6; padding-left: 20px; margin-top: 8px;">
        <li>Login como administrador en el campus</li>
        <li>Switch de rol a Estudiante vía URL (sin necesidad de CAS/SSO)</li>
        <li>Escaneo de cada sección del curso: actividades, restricciones, finalización</li>
        <li>Detección de actividades fantasma (referenciadas en restricciones pero inexistentes)</li>
        <li>Generación de reporte HTML + Allure + screenshots</li>
      </ol>
    </div>

    <div class="card">
      <h2>📬 Contacto</h2>
      <p style="color: #475569; font-size: 0.9em; line-height: 1.6;">
        Para consultas sobre este reporte o para solicitar una auditoría en otros cursos,
        comunicarse con el equipo de automatización del Campus Virtual UNC.
      </p>
    </div>

    <div class="footer">
      Generado por UNC Campus Virtual — Herramienta de Validación de Cursos<br />
      ${new Date().toISOString()} · <a href="https://github.com/nelgoez/unc-agentic-dev" style="color: #94a3b8;">github.com/nelgoez/unc-agentic-dev</a>
    </div>
  </div>
</body>
</html>`

const outPath = resolve(outDir, 'index.html')
writeFileSync(outPath, html)
console.warn(`Informe generado: ${outPath}`)
console.warn(`Tamaño: ~${(Buffer.byteLength(html) / 1024 / 1024).toFixed(1)} MB`)
