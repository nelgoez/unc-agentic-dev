# Trigger de Auditoría — Google Apps Script (reemplaza Netlify)

> La función Netlify `trigger-audit` agotó la cuota del plan free (125k invocaciones/mes).
> Este reemplazo corre en Google Apps Script, gratis y dentro del Google Workspace de la UNC.
> Prioridad de segundo plano: solo habilita que sigan corriendo auditorías con 1 click.

## Por qué Apps Script (y no Cloudflare)

- Sin cuentas nuevas: vive en Google Workspace (UNC ya usa Drive/Sheets/Docs).
- Gratis y durable: atado a la organización, sin vendor que abandonar.
- El volumen es trivial (unos pocos clicks/día), así que las cuotas de Apps Script sobran.

## Código (web app)

```javascript
// Guardar GITHUB_PAT en Propiedades del script (Project settings > Script properties)
const OWNER = 'nelgoez'
const REPO = 'unc-agentic-dev'
const WORKFLOW_FILE = 'audit-ci.yml'

// GET: https://script.google.com/macros/s/<id>/exec?courseId=304
function doGet(e) {
  const courseId = (e && e.parameter && e.parameter.courseId) || ''
  if (!courseId) return json({ error: 'courseId is required' })
  return trigger(courseId)
}

// POST alternativo (requiere Content-Type: text/plain en el cliente para evitar preflight)
function doPost(e) {
  let body = {}
  try {
    body = JSON.parse((e.postData && e.postData.contents) || '{}')
  } catch (_) {}
  const courseId = body.courseId
  if (!courseId) return json({ error: 'courseId is required' })
  return trigger(courseId)
}

function trigger(courseId) {
  const token = PropertiesService.getScriptProperties().getProperty('GITHUB_PAT')
  if (!token) return json({ error: 'GITHUB_PAT not configured' })
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`
  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    payload: JSON.stringify({ ref: 'master', inputs: { course_id: String(courseId) } }),
    muteHttpExceptions: true,
  })
  const code = res.getResponseCode()
  if (code === 204 || code === 200) {
    return json({ ok: true, message: `Auditoria disparada para curso ${courseId}.` })
  }
  return json({
    error: 'GitHub API error',
    status: code,
    detail: res.getContentText().substring(0, 500),
  })
}

function json(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON,
  )
}
```

## Setup

1. En https://script.google.com → Nuevo proyecto, pegar el código.
2. `Project settings > Script properties` → agregar `GITHUB_PAT` (token con scope `workflow`).
3. `Deploy > New deployment > Web app`:
   - Execute as: **Me**
   - Who has access: **Anyone** (o el dominio UNC)
4. Copiar la URL `/exec` y usarla en el botón del reporte.

## Cuidado con CORS

Apps Script **no** responde el preflight `OPTIONS` para `Content-Type: application/json` desde el
navegador. Por eso el botón debe usar **GET con `?courseId=N`** (sin body, sin preflight). Si se
prefiere POST, el cliente debe mandar `Content-Type: text/plain`.

El botón actual del reporte (`generateAuditHtml.ts` / `generateAuditIndex.ts`) apunta a
`https://unc-course-kit.netlify.app/api/trigger-audit`; al migrar, reemplazar por la URL `/exec` de
Apps Script con el parámetro `courseId` por query string.

## Fallback

- Cloudflare Workers (100k req/día) como alternativa si se prefiere fuera de Google.
- Botón → página de `workflow_dispatch` de GitHub Actions (rompe el 1-click, última opción).
