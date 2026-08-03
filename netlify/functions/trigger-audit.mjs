// Netlify serverless function — triggers GitHub Actions workflow_dispatch
// Deployed at: /.netlify/functions/trigger-audit
//
// Requires env var: GITHUB_PAT (repo-scoped token with workflow scope)
// Set in Netlify dashboard → Site settings → Environment variables

/** @param {Request} req */
export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Use POST' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }

  /** @type {{ courseId?: number; courseName?: string }} */
  let body
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }

  if (!body.courseId) {
    return new Response(JSON.stringify({ error: 'courseId is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }

  const token = process.env.GITHUB_PAT
  if (!token) {
    return new Response(JSON.stringify({ error: 'GITHUB_PAT not configured on server' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }

  const owner = 'nelgoez'
  const repo = 'unc-agentic-dev'
  const workflowFile = 'audit-ci.yml'
  const courseId = String(body.courseId)

  try {
    const dispatchUrl = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowFile}/dispatches`

    const ghRes = await fetch(dispatchUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ref: 'master',
        inputs: {
          course_id: courseId,
        },
      }),
    })

    if (ghRes.ok || ghRes.status === 204) {
      return new Response(
        JSON.stringify({
          ok: true,
          message: `Auditoria disparada para curso ${courseId}. Los resultados estaran disponibles en ~3 minutos.`,
          courseId: body.courseId,
          courseName: body.courseName || `Curso ${courseId}`,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        },
      )
    }

    const errText = await ghRes.text()
    return new Response(
      JSON.stringify({
        error: 'GitHub API error',
        status: ghRes.status,
        detail: errText.substring(0, 500),
      }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: 'Failed to trigger workflow',
        detail: err instanceof Error ? err.message : String(err),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      },
    )
  }
}

export const config = {
  path: '/api/trigger-audit',
}
