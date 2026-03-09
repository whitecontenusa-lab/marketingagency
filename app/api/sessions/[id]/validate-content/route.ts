import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { spawn } from 'child_process'
import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'

interface ValidationResult {
  pieceId: string
  ok: boolean
  violations: string[]
  suggestion: string
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { pieceIds } = await req.json() as { pieceIds: string[] }

  const session = await db.onboardingSession.findUnique({ where: { id } })
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  const pieces = await db.contentPiece.findMany({
    where: { id: { in: pieceIds }, sessionId: id },
  })

  if (!pieces.length) return NextResponse.json({ results: [] })

  const neverList = session.neverList || 'No restrictions defined'
  const values = session.values || ''
  const lang = session.language === 'en' ? 'English' : 'Spanish'

  const prompt = `CRITICAL EXECUTION MODE: Output a single raw JSON array — nothing else.

You are the brand ethics validator for "${session.brandName || session.clientName}".

BRAND NEVER-DO LIST:
${neverList}

BRAND VALUES:
${values}

Validate each content piece against the Never-Do List and Brand Values. Flag any violations or misalignments.

CONTENT PIECES TO VALIDATE:
${pieces.map(p => `
ID: ${p.id}
Platform: ${p.platform} | Format: ${p.format}
Hook: ${p.hook}
Body: ${p.body}
CTA: ${p.cta}
`).join('\n---\n')}

Respond in ${lang}. Output ONLY this JSON array:
[
  {
    "pieceId": "the piece id",
    "ok": true,
    "violations": [],
    "suggestion": ""
  },
  {
    "pieceId": "another piece id",
    "ok": false,
    "violations": ["Specific violation: the text says X which violates 'never do Y'"],
    "suggestion": "Improved version of the hook/body that respects the brand values"
  }
]

Be strict but fair. Only flag genuine violations, not style preferences.`

  let raw: string
  try {
    raw = await runClaude(prompt)
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }

  const match = raw.match(/\[[\s\S]*\]/)
  if (!match) return NextResponse.json({ error: 'Could not parse AI response' }, { status: 500 })

  let results: ValidationResult[]
  try {
    results = JSON.parse(match[0])
  } catch {
    return NextResponse.json({ error: 'Invalid JSON from AI' }, { status: 500 })
  }

  return NextResponse.json({ results })
}

async function runClaude(prompt: string): Promise<string> {
  const spawnEnv = { ...process.env }
  delete spawnEnv['CLAUDECODE']
  delete spawnEnv['CLAUDE_CODE_ENTRYPOINT']
  spawnEnv['HOME'] = 'C:\\Users\\geren'
  spawnEnv['USERPROFILE'] = 'C:\\Users\\geren'
  spawnEnv['APPDATA'] = 'C:\\Users\\geren\\AppData\\Roaming'
  spawnEnv['LOCALAPPDATA'] = 'C:\\Users\\geren\\AppData\\Local'

  const runDir = path.join(os.tmpdir(), `claude-validate-${Date.now()}`)
  fs.mkdirSync(runDir, { recursive: true })

  return new Promise((resolve, reject) => {
    const proc = spawn('claude', ['--print', '--dangerously-skip-permissions'], {
      env: spawnEnv, shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: runDir,
    })

    let stdout = ''
    proc.stdout.on('data', (d: Buffer) => { stdout += d.toString() })
    const timer = setTimeout(() => { proc.kill(); reject(new Error('Timeout')) }, 90_000)

    proc.on('close', (code: number) => {
      clearTimeout(timer)
      try { fs.rmSync(runDir, { recursive: true, force: true }) } catch { /* ignore */ }
      if (code !== 0 && !stdout) reject(new Error(`Claude exited ${code}`))
      else resolve(stdout)
    })

    proc.stdin.write(prompt, 'utf8', () => proc.stdin.end())
  })
}
