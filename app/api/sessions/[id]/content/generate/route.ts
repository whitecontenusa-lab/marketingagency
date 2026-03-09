import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { spawn } from 'child_process'
import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'

const PLATFORM_FORMATS: Record<string, string[]> = {
  instagram: ['post', 'reel', 'story', 'carousel'],
  tiktok: ['video'],
  facebook: ['post', 'video'],
  linkedin: ['post', 'article'],
  email: ['email'],
  blog: ['article'],
}

function buildPrompt(session: Record<string, string>, contenidoDoc: string, platforms: string[], count: number): string {
  return `CRITICAL EXECUTION MODE: You are running in a non-interactive pipeline. Output a single raw JSON array — nothing else. No markdown, no explanation, no code fences.

Generate ${count} content pieces for the brand "${session.brandName || session.clientName}" based on their approved marketing strategy.

BRAND CONTEXT:
- Brand: ${session.brandName}
- Product/Service: ${session.productDescription}
- Industry: ${session.industry}
- ICP Pain: ${session.icpPain}
- ICP Desire: ${session.icpDesire}
- Purpose: ${session.purpose}

STRATEGY — CONTENIDO MADRE:
${contenidoDoc.slice(0, 3000)}

TARGET PLATFORMS: ${platforms.join(', ')}

Generate pieces distributed across platforms. For each piece, use formats: ${platforms.map(p => `${p}: ${(PLATFORM_FORMATS[p] ?? ['post']).join('/')}`).join('; ')}

Output a JSON array of exactly ${count} objects with this structure:
[
  {
    "platform": "instagram",
    "format": "post",
    "hook": "First line that stops the scroll — max 10 words",
    "body": "Full caption or body text — 3-5 sentences in brand voice",
    "cta": "Clear call to action — max 15 words",
    "hashtags": "#tag1 #tag2 #tag3 (5-8 relevant hashtags for this platform)"
  }
]

Write all text in ${session.language === 'en' ? 'English' : 'Spanish'}. Be specific, creative, and aligned with the brand's emotional archetype. Output ONLY the JSON array.`
}

async function runClaude(prompt: string): Promise<string> {
  const spawnEnv = { ...process.env }
  delete spawnEnv['CLAUDECODE']
  delete spawnEnv['CLAUDE_CODE_ENTRYPOINT']
  spawnEnv['HOME'] = 'C:\\Users\\geren'
  spawnEnv['USERPROFILE'] = 'C:\\Users\\geren'
  spawnEnv['APPDATA'] = 'C:\\Users\\geren\\AppData\\Roaming'
  spawnEnv['LOCALAPPDATA'] = 'C:\\Users\\geren\\AppData\\Local'

  const runDir = path.join(os.tmpdir(), `claude-content-${Date.now()}`)
  fs.mkdirSync(runDir, { recursive: true })

  return new Promise((resolve, reject) => {
    const proc = spawn('claude', ['--print', '--dangerously-skip-permissions'], {
      env: spawnEnv,
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: runDir,
    })

    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', (d: Buffer) => { stdout += d.toString() })
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString() })

    const timer = setTimeout(() => {
      proc.kill()
      reject(new Error('Claude subprocess timed out after 90s'))
    }, 90_000)

    proc.on('close', (code: number) => {
      clearTimeout(timer)
      try { fs.rmSync(runDir, { recursive: true, force: true }) } catch { /* ignore */ }
      if (code !== 0 && !stdout) reject(new Error(`Claude exited ${code}: ${stderr.slice(0, 200)}`))
      else resolve(stdout)
    })

    proc.stdin.write(prompt, 'utf8', () => proc.stdin.end())
  })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { campaignId, platforms, count = 6 } = body as {
    campaignId?: string; platforms: string[]; count?: number
  }

  if (!platforms?.length) {
    return NextResponse.json({ error: 'platforms required' }, { status: 400 })
  }

  // Load session + blueprint
  const session = await db.onboardingSession.findUnique({
    where: { id },
    include: { blueprints: { orderBy: { createdAt: 'desc' }, take: 1 } },
  })
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  const blueprint = session.blueprints[0]
  if (!blueprint) return NextResponse.json({ error: 'No blueprint found — generate strategy first' }, { status: 400 })

  let contenidoDoc = ''
  try {
    const strategy = JSON.parse(blueprint.contentMd)
    contenidoDoc = strategy.documents?.contenido ?? blueprint.contentMd.slice(0, 4000)
  } catch {
    contenidoDoc = blueprint.contentMd.slice(0, 4000)
  }

  const prompt = buildPrompt(
    session as unknown as Record<string, string>,
    contenidoDoc,
    platforms,
    Math.min(count, 20),
  )

  let raw: string
  try {
    raw = await runClaude(prompt)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  // Extract JSON array from response
  const match = raw.match(/\[[\s\S]*\]/)
  if (!match) {
    return NextResponse.json({ error: 'Could not parse AI response', raw: raw.slice(0, 500) }, { status: 500 })
  }

  let pieces: Array<{ platform: string; format: string; hook: string; body: string; cta: string; hashtags: string }>
  try {
    pieces = JSON.parse(match[0])
  } catch {
    return NextResponse.json({ error: 'Invalid JSON from AI', raw: match[0].slice(0, 500) }, { status: 500 })
  }

  // Save to DB
  const saved = await db.$transaction(
    pieces.map(p =>
      db.contentPiece.create({
        data: {
          sessionId: id,
          campaignId: campaignId ?? null,
          platform: p.platform,
          format: p.format,
          hook: p.hook ?? '',
          body: p.body ?? '',
          cta: p.cta ?? '',
          hashtags: p.hashtags ?? '',
          aiGenerated: true,
          status: 'draft',
        },
      })
    )
  )

  return NextResponse.json({ pieces: saved, count: saved.length })
}
