#!/usr/bin/env node
/**
 * Avilion/Humind Platform Intelligence Generator
 *
 * Generates social-platform intelligence for all platforms via Claude subprocess.
 * Saves each result as a DRAFT to the portal API.
 * Team reviews and approves via /dashboard/plataformas.
 *
 * Required env:
 *   PORTAL_URL              (default: http://localhost:3001)
 *   PORTAL_INTERNAL_SECRET  (matches portal .env)
 *   HOME / USERPROFILE / APPDATA / LOCALAPPDATA  (set in GitHub Actions)
 *
 * Usage:
 *   node scripts/generate-platform-intelligence.mjs
 */

import { spawn } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'

const PORTAL_URL = process.env.PORTAL_URL || 'http://localhost:3001'
const SECRET = process.env.PORTAL_INTERNAL_SECRET
if (!SECRET) {
  console.error('❌ PORTAL_INTERNAL_SECRET env var required')
  process.exit(1)
}

const PLATFORMS = [
  'instagram',
  'tiktok',
  'facebook',
  'youtube',
  'threads',
  'linkedin',
  'pinterest',
  'x',
]

// ── Platform-specific context ─────────────────────────────────────────────────

const PLATFORM_CONTEXT = {
  instagram: 'Instagram (Meta) — photo/video sharing, Reels, Stories, Carousels, broadcast channels. Main audience: 18-34. Content discovery via Explore and hashtags.',
  tiktok: 'TikTok — short-form video (15s–10min), For You Page algorithmic feed, Duets, stitches, trends, sounds. Highly viral organic reach. Main audience: 16-30.',
  facebook: 'Facebook (Meta) — feed posts, Reels, Stories, Groups, Events. Organic reach declining but Groups and Reels still strong. Main audience: 25-54.',
  youtube: 'YouTube (Google) — long-form video, Shorts (60s), playlists, community posts. Search-driven discovery. Strong SEO value. All age groups.',
  threads: 'Threads (Meta) — text-first microblogging, connected to Instagram followers. Conversation-focused. Growing platform. Main audience: 25-40.',
  linkedin: 'LinkedIn (Microsoft) — professional network, B2B content, thought leadership, company pages. Strong organic reach for text posts and newsletters. Main audience: 25-55 professionals.',
  pinterest: 'Pinterest — visual discovery, idea boards, product pins, shoppable content. Strong for evergreen content. Main audience: 25-45 women (70%), planning/lifestyle intent.',
  x: 'X (formerly Twitter) — real-time text/media microblogging, trending topics, Communities. Organic reach reduced. Main audience: 25-45, high-intent early adopters.',
}

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `CRITICAL EXECUTION MODE: You are running in a non-interactive pipeline. You MUST NOT use any file tools, write_file, create_file, bash, or any other tools. Your entire response must be a single raw JSON object — nothing else. No markdown fences, no preamble, no explanation.

You are the Avilion/Humind Platform Intelligence Specialist. Your job is to produce a precise, actionable intelligence report on the given social media platform based on your most current knowledge of algorithm behavior, content performance, and platform trends.

This report will be used to optimize content strategy and AI content generation for brands across multiple industries. The team will review your output and approve or edit before it goes live.

Focus on:
1. What the algorithm ACTUALLY rewards today (engagement signals, watch time, saves, saves-to-reach ratio, etc.)
2. Which content formats have the best organic reach right now
3. Ideal posting frequency and optimal times based on audience behavior
4. Current trending content types, angles, and formats
5. What SUPPRESSES content (shadow bans, algorithm penalties, low-quality signals)
6. Recent notable algorithm or feature changes
7. Emerging features worth using for brand content

Be specific, practical, and actionable. Avoid generic marketing advice. Rate your confidence as "high", "medium", or "low" based on how current your knowledge is for this platform.`

// ── Claude subprocess helper ──────────────────────────────────────────────────

async function runClaude(prompt, timeoutMs = 120_000) {
  const claudeRunDir = path.join(os.tmpdir(), `claude-platintel-${Date.now()}`)
  fs.mkdirSync(claudeRunDir, { recursive: true })

  const spawnEnv = { ...process.env }
  delete spawnEnv.CLAUDECODE
  delete spawnEnv.CLAUDE_CODE_ENTRYPOINT

  return new Promise((resolve, reject) => {
    const proc = spawn('claude --print --dangerously-skip-permissions', [], {
      env: spawnEnv,
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: claudeRunDir,
    })

    proc.stdin.write(prompt, 'utf8', () => proc.stdin.end())

    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', c => { stdout += c.toString('utf8') })
    proc.stderr.on('data', c => { stderr += c.toString('utf8') })

    const timer = setTimeout(() => {
      proc.kill('SIGTERM')
      reject(new Error(`TIMEOUT after ${timeoutMs / 1000}s`))
    }, timeoutMs)

    proc.on('close', (code, signal) => {
      clearTimeout(timer)
      if (code !== 0 || signal) {
        reject(new Error(`claude exited code=${code} signal=${signal}\nstderr: ${stderr.slice(0, 300)}`))
      } else {
        resolve(stdout)
      }
    })
    proc.on('error', err => { clearTimeout(timer); reject(err) })
  })
}

// ── Save to portal API ────────────────────────────────────────────────────────

async function saveToPortal(platform, data) {
  const res = await fetch(`${PORTAL_URL}/api/platform-intelligence`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': SECRET,
    },
    body: JSON.stringify({ platform, ...data }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`API ${res.status}: ${body}`)
  }
  return res.json()
}

// ── Main ─────────────────────────────────────────────────────────────────────

const updated = []
const errors = []

for (const platform of PLATFORMS) {
  console.log(`\n🔍 Analyzing ${platform.toUpperCase()}...`)

  const userPrompt = `${SYSTEM_PROMPT}

---

PLATFORM: ${platform.toUpperCase()}
CONTEXT: ${PLATFORM_CONTEXT[platform]}

Generate a comprehensive intelligence report for this platform.

Output ONLY this JSON object (no markdown, no fences):

{
  "algorithmPriorities": [
    "string: specific signal the algorithm rewards",
    "string: second priority",
    "string: third priority",
    "string: fourth priority",
    "string: fifth priority"
  ],
  "bestFormats": [
    {"format": "format name", "why": "why it performs well", "engagementNote": "specific engagement characteristic"},
    {"format": "second format", "why": "reason", "engagementNote": "note"},
    {"format": "third format", "why": "reason", "engagementNote": "note"}
  ],
  "bestFrequency": "Specific posting frequency recommendation, e.g.: '5-7 posts/week — 1 Reel + 4-5 posts'",
  "optimalTiming": "Specific days and times, e.g.: 'Tue-Thu 11am-1pm and 7-9pm local time. Avoid Monday mornings.'",
  "currentTrends": [
    {"trend": "trend name", "angle": "how to use it for brands", "why": "why it performs"},
    {"trend": "second trend", "angle": "brand angle", "why": "reason"},
    {"trend": "third trend", "angle": "angle", "why": "reason"},
    {"trend": "fourth trend", "angle": "angle", "why": "reason"}
  ],
  "avoidList": [
    {"what": "specific thing to avoid", "why": "specific consequence"},
    {"what": "second thing", "why": "reason"},
    {"what": "third thing", "why": "reason"},
    {"what": "fourth thing", "why": "reason"}
  ],
  "recentChanges": [
    {"change": "specific algorithm or policy change", "impact": "how it affects content creators", "when": "approximate timeframe"},
    {"change": "second change", "impact": "impact", "when": "timeframe"}
  ],
  "emergingFeatures": [
    {"feature": "feature name", "useCase": "how brands can use it"},
    {"feature": "second feature", "useCase": "use case"}
  ],
  "confidence": "high | medium | low"
}`

  try {
    const raw = await runClaude(userPrompt, 120_000)
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No JSON object found in output')

    // Parse and stringify arrays as JSON strings for storage
    const parsed = JSON.parse(match[0])
    const data = {
      algorithmPriorities: JSON.stringify(parsed.algorithmPriorities ?? []),
      bestFormats: JSON.stringify(parsed.bestFormats ?? []),
      bestFrequency: String(parsed.bestFrequency ?? ''),
      optimalTiming: String(parsed.optimalTiming ?? ''),
      currentTrends: JSON.stringify(parsed.currentTrends ?? []),
      avoidList: JSON.stringify(parsed.avoidList ?? []),
      recentChanges: JSON.stringify(parsed.recentChanges ?? []),
      emergingFeatures: JSON.stringify(parsed.emergingFeatures ?? []),
      confidence: String(parsed.confidence ?? 'medium'),
    }

    await saveToPortal(platform, data)
    console.log(`  ✅ ${platform} saved as draft`)
    updated.push(platform)
  } catch (err) {
    console.error(`  ❌ ${platform} failed:`, err.message)
    errors.push({ platform, error: err.message })
  }
}

console.log(`\n─────────────────────────────────────`)
console.log(`✅ Updated: ${updated.join(', ') || 'none'}`)
if (errors.length) {
  console.log(`❌ Errors: ${errors.map(e => `${e.platform} (${e.error})`).join(', ')}`)
}
console.log(`\nTeam review required at: ${PORTAL_URL}/dashboard/plataformas`)

if (errors.length === PLATFORMS.length) process.exit(1)
