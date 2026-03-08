/**
 * GitHub REST API helpers
 * Used by the portal to push interview data and poll for generated strategy files.
 */

const GITHUB_API = 'https://api.github.com'

function githubHeaders() {
  const token = process.env.GITHUB_TOKEN
  if (!token) throw new Error('GITHUB_TOKEN not set in .env')
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  }
}

function repoBase() {
  const owner = process.env.GITHUB_REPO_OWNER
  const repo = process.env.GITHUB_REPO_NAME
  if (!owner || !repo) throw new Error('GITHUB_REPO_OWNER or GITHUB_REPO_NAME not set')
  return `${GITHUB_API}/repos/${owner}/${repo}`
}

/** Push (create or update) a file in the GitHub repo */
export async function githubPushFile(path: string, content: string, message: string): Promise<void> {
  const base = repoBase()
  const encoded = Buffer.from(content).toString('base64')

  // Check if file exists (need SHA for updates)
  const getRes = await fetch(`${base}/contents/${path}`, { headers: githubHeaders() })
  const body: Record<string, unknown> = { message, content: encoded }
  if (getRes.ok) {
    const existing = await getRes.json() as { sha: string }
    body.sha = existing.sha
  }

  const res = await fetch(`${base}/contents/${path}`, {
    method: 'PUT',
    headers: githubHeaders(),
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`GitHub push failed for ${path}: ${err}`)
  }
}

/** Read a file from the GitHub repo. Returns null if not found. */
export async function githubReadFile(path: string): Promise<string | null> {
  const base = repoBase()
  const res = await fetch(`${base}/contents/${path}`, { headers: githubHeaders() })
  if (res.status === 404) return null
  if (!res.ok) return null
  const data = await res.json() as { content: string; encoding: string }
  if (data.encoding !== 'base64') return null
  return Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf8')
}

/** Check if GitHub integration is configured */
export function githubConfigured(): boolean {
  return !!(process.env.GITHUB_TOKEN && process.env.GITHUB_REPO_OWNER && process.env.GITHUB_REPO_NAME)
}
