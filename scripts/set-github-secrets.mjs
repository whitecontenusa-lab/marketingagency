/**
 * Encrypts and uploads secrets to GitHub repo via API.
 * Uses libsodium sealed-box encryption as required by GitHub.
 */
import _sodium from 'libsodium-wrappers'

const TOKEN = process.env.GITHUB_TOKEN
const OWNER = 'whitecontenusa-lab'
const REPO  = 'marketingagency'
const KEY_ID = process.env.GITHUB_PUBLIC_KEY_ID
const PUBLIC_KEY = process.env.GITHUB_PUBLIC_KEY

const SECRETS = {
  GITEA_URL:        process.env.GITEA_URL,
  GITEA_TOKEN:      process.env.GITEA_TOKEN,
  GITEA_REPO_OWNER: process.env.GITEA_REPO_OWNER || 'avilion',
  GITEA_REPO_NAME:  process.env.GITEA_REPO_NAME  || 'avilion',
}

await _sodium.ready
const sodium = _sodium

function encryptSecret(value) {
  const keyBytes = Buffer.from(PUBLIC_KEY, 'base64')
  const messageBytes = Buffer.from(value, 'utf8')
  const encryptedBytes = sodium.crypto_box_seal(messageBytes, keyBytes)
  return Buffer.from(encryptedBytes).toString('base64')
}

const base = `https://api.github.com/repos/${OWNER}/${REPO}/actions/secrets`
const headers = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'Content-Type': 'application/json',
}

for (const [name, value] of Object.entries(SECRETS)) {
  const encrypted_value = encryptSecret(value)
  const res = await fetch(`${base}/${name}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ encrypted_value, key_id: KEY_ID }),
  })
  console.log(`${name}: ${res.status === 204 || res.status === 201 ? '✅' : '❌ ' + res.status}`)
}
