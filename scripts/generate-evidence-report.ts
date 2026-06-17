import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const outDir = resolve('reports/informe-curso-269')
mkdirSync(outDir, { recursive: true })

function imgToBase64(path: string): string {
  const buf = readFileSync(resolve(path))
  const ext = path.split('.').pop()?.toLowerCase() || 'png'
  const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png'
  return `data:${mime};base64,${buf.toString('base64')}`
}

const evidenceImgs = [
  {
    file: 'reports/evidence/01-course-landing.png',
    label: 'Vista general del curso — Módulo 2 activo, Módulo 3 bloqueado',
  },
  {
    file: 'reports/evidence/02-mod3-forced-click.png',
    label: 'After click en Módulo 3 — el contenido no se muestra',
  },
  {
    file: 'reports/evidence/03-tab-bar.png',
    label: 'Barra de pestañas — Módulo 3 y Cierre aparecen como "dimmed disabled"',
  },
  {
    file: 'reports/evidence/05-sidebar-biblioteca.png',
    label: 'Biblioteca del curso (sidebar) — "Funcion Lambda" es solo un PDF',
  },
  {
    file: 'reports/evidence/06-pdf-triggered.png',
    label: 'Intento de acceso al PDF "Funcion Lambda" — descarga, no es una actividad Moodle',
  },
  {
    file: 'reports/evidence/07-after-pdf-still-locked.png',
    label: 'Después de descargar el PDF — Módulo 3 SIGUE BLOQUEADO (STILL_LOCKED)',
  },
]

const moduleImgs = [
  { file: 'reports/audit/course-269-section-0.png', label: 'Bienvenida' },
  { file: 'reports/audit/course-269-section-1.png', label: 'Módulo 1' },
  { file: 'reports/audit/course-269-section-2.png', label: 'Módulo 2' },
  { file: 'reports/audit/course-269-section-3.png', label: 'Módulo 3 (bloqueado)' },
  { file: 'reports/audit/course-269-section-4.png', label: 'Cierre (bloqueado)' },
]

const evidenceCards = evidenceImgs
  .map(
    (img) => `
  <div class="evidence-card">
    <h3>${img.label}</h3>
    <img src="${imgToBase64(img.file)}" alt="${img.label}" />
  </div>
`,
  )
  .join('\n')

const moduleCards = moduleImgs
  .map(
    (img) => `
  <div class="evidence-card">
    <h3>${img.label}</h3>
    <img src="${imgToBase64(img.file)}" alt="${img.label}" />
  </div>
`,
  )
  .join('\n')

const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Informe de Auditoría — Curso 269 | UNC Campus Virtual</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f1f5f9; color: #1e293b; padding: 24px; }
    .container { max-width: 960px; margin: 0 auto; }
    h1 { font-size: 1.5em; margin-bottom: 4px; color: #0f172a; }
    .subtitle { color: #64748b; font-size: 0.9em; margin-bottom: 24px; }
    .badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-weight: 700; font-size: 0.85em; color: white; margin-bottom: 16px; }
    .badge-critical { background: #dc2626; }
    .badge-warning { background: #f59e0b; }
    .badge-info { background: #3b82f6; }
    .card { background: white; border-radius: 12px; padding: 24px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .card h2 { font-size: 1.15em; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; }
    .finding { display: flex; gap: 12px; padding: 14px; border-radius: 8px; margin-bottom: 10px; font-size: 0.9em; }
    .finding-critical { background: #fef2f2; border: 1px solid #fecaca; }
    .finding-info { background: #eff6ff; border: 1px solid #bfdbfe; }
    .finding-icon { font-size: 1.3em; flex-shrink: 0; }
    .finding-title { font-weight: 700; margin-bottom: 4px; }
    .finding-detail { color: #475569; font-size: 0.9em; line-height: 1.5; }
    .finding-meta { color: #64748b; font-size: 0.8em; margin-top: 4px; }
    .evidence-card { background: white; border-radius: 12px; padding: 16px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .evidence-card h3 { font-size: 1em; margin-bottom: 10px; color: #334155; }
    .evidence-card img { width: 100%; border-radius: 8px; border: 1px solid #e2e8f0; }
    .evidence-card p { margin-top: 8px; color: #64748b; font-size: 0.85em; }
    .summary { background: white; border-radius: 12px; padding: 24px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .summary table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    .summary th, .summary td { text-align: left; padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 0.9em; }
    .summary th { background: #f8fafc; font-weight: 600; }
    .code { background: #f1f5f9; padding: 12px 16px; border-radius: 8px; font-family: monospace; font-size: 0.85em; margin: 12px 0; overflow-x: auto; white-space: pre-wrap; }
    .sidebar-link { color: #2563eb; }
    .footer { text-align: center; color: #94a3b8; font-size: 0.8em; margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; }

    @media print {
      @page { margin: 15mm; size: A4; }
      body { background: white; padding: 0; font-size: 10pt; }
      .container { max-width: 100%; }
      .evidence-card, .summary, .header, .card:first-of-type { break-inside: avoid; page-break-inside: avoid; box-shadow: none; border: 1px solid #e2e8f0; }
      .card { break-inside: auto; box-shadow: none; border: 1px solid #e2e8f0; }
      .card h2 { break-after: avoid; }
      .card .finding, .card table, .card .code, .card ul, .card ol, .card p { break-inside: avoid; page-break-inside: avoid; }
      .evidence-card img { max-height: 160mm; object-fit: contain; }
      .finding { break-inside: avoid; page-break-inside: avoid; }
      .code { font-size: 7.5pt; white-space: pre-wrap; word-break: break-all; }
      table { font-size: 8pt; break-inside: avoid; page-break-inside: avoid; }
      .badge { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .finding-critical, .finding-info, .badge-critical, .badge-info { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      h1 { font-size: 16pt; }
      h2 { font-size: 13pt; }
      h3, h4 { font-size: 11pt; }
      .card { break-before: page; }
      .card:first-of-type { break-before: avoid; }
      hr { break-after: avoid; }
      .footer { position: fixed; bottom: 0; width: 100%; font-size: 7pt; }
      .header, .card:first-of-type { break-inside: avoid; page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div style="text-align: center; margin-bottom: 24px;">
      <span class="badge badge-critical">CRÍTICO</span>
      <h1>Aprendiendo a caminar en Python - Certificación 1</h1>
      <p class="subtitle">Curso ID: 269 · Campus Virtual UNC · 16 de junio 2026</p>
    </div>

    <div class="summary">
      <h2>Resumen de Hallazgos</h2>
      <table>
        <tr><th>Severidad</th><th>Cantidad</th><th>Descripción</th></tr>
        <tr>
          <td><span class="badge badge-critical" style="font-size:0.75em; padding:2px 10px;">CRÍTICO</span></td>
          <td>1</td>
          <td>Actividad "Notebook Funcion-Lambda" referenciada en restricción pero inexistente en el curso</td>
        </tr>
        <tr>
          <td><span class="badge badge-info" style="font-size:0.75em; padding:2px 10px;">INFO</span></td>
          <td>6</td>
          <td>Actividades del Cierre no verificables (están dentro de Módulo 3, que está bloqueado)</td>
        </tr>
      </table>
    </div>

    <div class="card">
      <h2>🔍 Causa Raíz — Actividad Fantasma</h2>
      <div class="finding finding-critical">
        <div class="finding-icon">🔴</div>
        <div class="finding-content">
          <div class="finding-title">"Notebook Funcion-Lambda" no existe como actividad de Moodle</div>
          <div class="finding-detail">
            La restricción de disponibilidad del Módulo 3 dice:
            <div class="code">Not available unless: The activity Notebook Funcion-Lambda is marked complete</div>
            <p style="margin-top: 8px;">Sin embargo, en todo el curso no hay ninguna actividad con ese nombre. El único recurso relacionado es un archivo PDF en la Biblioteca del curso.</p>
          </div>
        </div>
      </div>
      <div class="finding finding-info">
        <div class="finding-icon">ℹ️</div>
        <div class="finding-content">
          <div class="finding-title">6 hallazgos informativos en cascada</div>
          <div class="finding-detail">
            El Cierre requiere actividades que estarían en Módulo 3 (Clases del Módulo 3, actividad individual, notebooks de Tuplas, Listas, Conjuntos, Diccionarios). Como Módulo 3 está bloqueado, no se pueden verificar. <strong>No son actividades fantasma</strong> — se resuelven automáticamente al corregir la causa raíz.
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <h2>📋 Prueba de la Evidencia</h2>
      <p style="margin-bottom: 16px; color: #475569; font-size: 0.9em;">
        A continuación, las capturas que demuestran el bloqueo y la inexistencia de la actividad requerida:
      </p>

      <div class="finding finding-info">
        <div class="finding-icon">🔬</div>
        <div class="finding-content">
          <div class="finding-title">Dato extraído del HTML de la página</div>
          <div class="finding-detail">
            El DOM expone un div con id <code>format_onetopic_winfo_tab-...</code> que contiene el texto exacto:
            <div class="code">Not available unless: The activity Notebook Funcion-Lambda is marked complete</div>
            La pestaña de Módulo 3 tiene <code>title="Módulo 3: Hidden from students"</code> y clases <code>dimmed disabled</code>.
          </div>
        </div>
      </div>

      ${evidenceCards}
    </div>

    <div class="card">
      <h2>📷 Screenshots por Módulo</h2>
      <p style="margin-bottom: 16px; color: #475569; font-size: 0.9em;">
        Capturas de cada sección del curso desde la vista del estudiante (nelthor):
      </p>
      ${moduleCards}
    </div>

    <div class="card">
      <h2>📚 Biblioteca del Curso (Sidebar)</h2>
      <p style="margin-bottom: 12px; color: #475569; font-size: 0.9em;">
        Recursos listados en el bloque "📚 Biblioteca" del sidebar derecho. Nótese que 
        <strong>"Funcion Lambda" es un PDF</strong> (pluginfile.php), no una actividad Moodle con seguimiento:
      </p>
      <table>
        <tr><th>Módulo</th><th>Recurso</th><th>Tipo</th></tr>
        <tr><td>Módulo 1</td><td>Guía de instalación</td><td><span class="sidebar-link">mod/resource/view.php?id=6911</span></td></tr>
        <tr><td>Módulo 1</td><td>Instalación y configuración del entorno</td><td><span class="sidebar-link">mod/resource/view.php?id=6912</span></td></tr>
        <tr><td>Módulo 1</td><td>Sintaxis básica y estructura de Python</td><td><span class="sidebar-link">mod/resource/view.php?id=6913</span></td></tr>
        <tr><td>Módulo 1</td><td>Documentación con Markdown</td><td><span class="sidebar-link">mod/resource/view.php?id=6914</span></td></tr>
        <tr><td>Módulo 2</td><td><strong>Funcion Lambda</strong></td><td><strong style="color:#dc2626;">pluginfile.php (PDF suelto — NO es actividad Moodle)</strong></td></tr>
        <tr><td>Módulo 2</td><td>Funciones: definición y argumentos</td><td><span class="sidebar-link">mod/resource/view.php?id=6916</span></td></tr>
        <tr><td>Módulo 2</td><td>Funciones lambda y programación funcional</td><td><span class="sidebar-link">mod/resource/view.php?id=6917</span></td></tr>
        <tr><td>Módulo 3</td><td>Colecciones: Tuplas</td><td><span class="sidebar-link">mod/resource/view.php?id=6919</span></td></tr>
        <tr><td>Módulo 3</td><td>Colecciones: Listas y métodos</td><td><span class="sidebar-link">mod/resource/view.php?id=6921</span></td></tr>
        <tr><td>Módulo 3</td><td>Colecciones: Conjuntos (Sets)</td><td><span class="sidebar-link">mod/resource/view.php?id=6923</span></td></tr>
        <tr><td>Módulo 3</td><td>Colecciones: Diccionarios clave–valor</td><td><span class="sidebar-link">mod/resource/view.php?id=6924</span></td></tr>
        <tr><td>Cierre</td><td>Recurso de integración final 1</td><td><span class="sidebar-link">mod/page/view.php?id=7009</span></td></tr>
        <tr><td>Cierre</td><td>Recurso de integración final 2</td><td><span class="sidebar-link">mod/page/view.php?id=7010</span></td></tr>
      </table>
    </div>

    <div class="card">
      <h2>🧪 Prueba de concepto: descargar el PDF no desbloquea nada</h2>
      <div class="finding finding-info">
        <div class="finding-icon">✅</div>
        <div class="finding-content">
          <div class="finding-title">Verificación</div>
          <div class="finding-detail">
            Se navegó a la URL del PDF "Funcion Lambda". El navegador descargó el archivo 
            <code>"Funcion Lambda.pdf"</code>. Luego se volvió al curso y se verificó el estado 
            del Módulo 3: <strong>STILL_LOCKED</strong>. 
            Descargar un PDF no completa ninguna actividad de Moodle.
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <h2>🔧 Recomendación</h2>
      <p style="color: #475569; font-size: 0.9em; line-height: 1.6;">
        <strong>Acción correctiva:</strong> En la configuración del curso, revisar las 
        <em>Restricciones de disponibilidad</em> del Módulo 3. La condición actual 
        referencia "Notebook Funcion-Lambda" como una actividad con seguimiento de 
        finalización. Hay dos opciones:
      </p>
      <ol style="margin-top: 12px; padding-left: 20px; color: #475569; font-size: 0.9em; line-height: 1.6;">
        <li><strong>Opción A:</strong> Crear una actividad de Moodle (ej. recurso PDF o página) 
          llamada "Notebook Funcion-Lambda" con seguimiento de finalización habilitado, 
          y colocarla en Módulo 2.</li>
        <li><strong>Opción B:</strong> Eliminar la restricción de disponibilidad del Módulo 3 
          si no es necesaria, o reemplazarla por una condición que use una actividad que 
          realmente exista.</li>
      </ol>
      <p style="margin-top: 12px; color: #475569; font-size: 0.9em;">
        Una vez corregido, el Módulo 3 se desbloqueará y las 6 actividades del Cierre 
        serán accesibles automáticamente.
      </p>
    </div>

     <hr style="margin: 32px 0; border: none; border-top: 2px solid #e2e8f0;" />

     <div class="card">
       <h2>🧰 Acerca del Validador de Cursos</h2>

       <h3 style="margin: 16px 0 8px; font-size: 1em; color: #0f172a;">¿Qué es?</h3>
       <p style="color: #475569; font-size: 0.9em; line-height: 1.6;">
         Una herramienta de auditoría automatizada que detecta <strong>actividades fantasma</strong> en cursos de Moodle:
         actividades que el sistema considera requeridas para avanzar pero que el estudiante <strong>no puede ver ni completar</strong>.
       </p>

       <h3 style="margin: 16px 0 8px; font-size: 1em; color: #0f172a;">¿Cómo funciona?</h3>
       <ol style="color: #475569; font-size: 0.9em; line-height: 1.6; padding-left: 20px;">
         <li>Se loguea como <strong>estudiante</strong> en el curso</li>
         <li>Escanea cada módulo/sección y registra: actividades visibles, estado de finalización, bloqueos, y texto de restricciones</li>
         <li>Cruza las actividades requeridas (mencionadas en las restricciones de disponibilidad) contra las actividades visibles</li>
         <li>Reporta en <strong>HTML</strong> con screenshots por módulo, semáforo rojo/verde, y explicación en lenguaje natural</li>
       </ol>

       <h3 style="margin: 16px 0 8px; font-size: 1em; color: #0f172a;">Estructura del proyecto</h3>
       <div class="code">
pages/
  LoginPage.ts              ← Autenticación
  StudentCoursePage.ts       ← POM: vista del estudiante
  AdminCoursePage.ts         ← POM: vista del admin (stub)
  CourseValidationReport.ts  ← Motor de diff + reportes HTML

tests/
  validate-course.spec.ts    ← Test que orquesta la auditoría
  evidence-course-269.spec.ts ← Test de evidencia visual

reports/
  audit/                     ← Reportes HTML + screenshots por módulo
  evidence/                  ← Screenshots de evidencia
  informe-curso-269/         ← Este informe combinado (índice + todo embebido)
       </div>

       <h3 style="margin: 16px 0 8px; font-size: 1em; color: #0f172a;">Variables de entorno (.env)</h3>
       <div class="code">
STUDENT_USERNAME=usuario_estudiante
STUDENT_PASSWORD=password_estudiante
ADMIN_USERNAME=usuario_admin        ← opcional
ADMIN_PASSWORD=password_admin       ← opcional
TEST_COURSE_ID=269                  ← ID del curso a auditar
MOODLE_BASE_URL=https://campus.aulavirtual.unc.edu.ar
       </div>

       <h3 style="margin: 16px 0 8px; font-size: 1em; color: #0f172a;">Cómo se usa</h3>
       <div class="code">
# Una sola línea
npx playwright test tests/validate-course.spec.ts

# El reporte queda en:
# reports/audit/audit-course-{ID}.html
       </div>
     </div>

     <div class="card">
       <h2>💰 Rango de precios estimado (para negociación)</h2>
       <p style="color: #475569; font-size: 0.9em; line-height: 1.6; margin-bottom: 12px;">
         El valor final depende de dos factores que hoy no podemos medir sin acceso admin:
       </p>

       <h3 style="margin: 16px 0 8px; font-size: 1em; color: #0f172a;">Factor 1: Cantidad de módulos por curso</h3>
       <ul style="color: #475569; font-size: 0.9em; line-height: 1.6; padding-left: 20px;">
         <li>Cursos con 3 módulos = menor esfuerzo (ej: Yoga, Python 1)</li>
         <li>Cursos con 4+ módulos + cierre = mayor esfuerzo (ej: IA y Automatización)</li>
         <li>Rango: <strong>3 a 7 módulos por curso</strong> según los datos del plan</li>
       </ul>

       <h3 style="margin: 16px 0 8px; font-size: 1em; color: #0f172a;">Factor 2: Complejidad de la vista admin (desconocida hoy)</h3>
       <ul style="color: #475569; font-size: 0.9em; line-height: 1.6; padding-left: 20px;">
         <li>Si la vista admin tiene <strong>"Ver como estudiante"</strong> con un clic → integración directa</li>
         <li>Si requiere navegar a <strong>reportes separados</strong> (gradebook, completion report) → más desarrollo</li>
         <li>Si tiene <strong>tabla de estudiantes</strong> con enlace individual → más páginas POM</li>
       </ul>

       <h3 style="margin: 16px 0 8px; font-size: 1em; color: #0f172a;">Rango estimado para Opción A (Auditoría Única)</h3>
       <table>
         <tr><th>Cursos</th><th>Módulos totales</th><th>Esfuerzo</th><th>Rango</th></tr>
         <tr><td>3 cursos base (plan actual)</td><td>~15 módulos</td><td>30-50 h</td><td><strong>$600–$1.000 USD</strong></td></tr>
         <tr><td>5 cursos</td><td>~25 módulos</td><td>50-80 h</td><td><strong>$1.000–$1.600 USD</strong></td></tr>
         <tr><td>12 cursos (todos los nuevos)</td><td>~60 módulos</td><td>120-200 h</td><td><strong>$2.400–$4.000 USD</strong></td></tr>
       </table>
       <p style="margin-top: 12px; color: #64748b; font-size: 0.85em; font-style: italic;">
         El precio se ajusta cuando tengamos acceso admin y podamos medir la complejidad real de la 
         vista administrativa. Es un <strong>rango de piso</strong>, no un presupuesto cerrado.
       </p>

       <h3 style="margin: 16px 0 8px; font-size: 1em; color: #0f172a;">Opciones futuras (sin precio aún)</h3>
       <ul style="color: #475569; font-size: 0.9em; line-height: 1.6; padding-left: 20px;">
         <li><strong>Opción B — Entrega del Tool:</strong> La UNC se queda con la herramienta y la corre cuando quiera.</li>
         <li><strong>Opción C — Tool + Capacitación:</strong> Incluye sesión remota para interpretar reportes y agregar cursos.</li>
       </ul>
     </div>

     <div class="footer">
       Generado por UNC Campus Virtual — Herramienta de Validación de Cursos · v1.0<br />
       Playwright + TypeScript · ${new Date().toISOString()}
     </div>
  </div>
</body>
</html>`

const outPath = resolve(outDir, 'index.html')
writeFileSync(outPath, html)
console.warn(`Informe generado: ${outPath}`)
console.warn(
  `Tamaño: ~${(Buffer.byteLength(html) / 1024 / 1024).toFixed(1)} MB (imágenes embebidas)`,
)
