const GITEA_URL = process.env.GITEA_URL ?? 'http://localhost:3000'
const GITEA_TOKEN = process.env.GITEA_TOKEN ?? ''

async function getOwner(): Promise<string> {
  const res = await fetch(`${GITEA_URL}/api/v1/user`, {
    headers: {
      Authorization: `token ${GITEA_TOKEN}`,
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Gitea API error ${res.status} (GET /user): ${text}`)
  }
  const json = await res.json() as { login: string }
  return json.login
}

export async function createClientRepo(slug: string): Promise<{ url: string; owner: string }> {
  if (!GITEA_TOKEN) {
    console.warn('[gitea] GITEA_TOKEN is not set — skipping repo creation (graceful degradation)')
    return { url: `${GITEA_URL}/dev/${slug}`, owner: 'dev' }
  }

  const owner = await getOwner()

  const res = await fetch(`${GITEA_URL}/api/v1/user/repos`, {
    method: 'POST',
    headers: {
      Authorization: `token ${GITEA_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: slug, private: false, auto_init: true }),
  })

  // 409 means the repo already exists — treat as success
  if (res.status !== 409 && !res.ok) {
    const text = await res.text()
    throw new Error(`Gitea API error ${res.status} (POST /user/repos): ${text}`)
  }

  return { url: `${GITEA_URL}/${owner}/${slug}`, owner }
}

export async function pushProfileFiles(
  owner: string,
  slug: string,
  files: Array<{ path: string; content: string }>
): Promise<void> {
  if (!GITEA_TOKEN) {
    console.warn('[gitea] GITEA_TOKEN is not set — skipping file push (graceful degradation)')
    return
  }

  for (const file of files) {
    const encoded = Buffer.from(file.content, 'utf-8').toString('base64')

    const res = await fetch(
      `${GITEA_URL}/api/v1/repos/${owner}/${slug}/contents/${file.path}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `token ${GITEA_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'init: add profile files',
          content: encoded,
        }),
      }
    )

    // 422 means the file already exists — skip it
    if (res.status === 422) continue

    if (!res.ok) {
      const text = await res.text()
      throw new Error(
        `Gitea API error ${res.status} (PUT /repos/${owner}/${slug}/contents/${file.path}): ${text}`
      )
    }
  }
}
