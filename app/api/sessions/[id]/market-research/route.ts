import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { spawn } from 'child_process'
import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const intel = await db.marketIntelligence.findUnique({ where: { sessionId: id } })
  return NextResponse.json(intel)
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const session = await db.onboardingSession.findUnique({ where: { id } })
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  const lang = session.language === 'en' ? 'English' : 'Spanish'

  const prompt = `CRITICAL EXECUTION MODE: Non-interactive pipeline. Output a single raw JSON object — nothing else. No markdown, no explanation, no code fences.

You are a market intelligence analyst. Analyze the market for this brand and return structured intelligence.

CLIENT:
- Industry: ${session.industry}
- Country: ${session.country}
- Product: ${session.productDescription}
- Price: $${session.productPrice} USD
- ICP Pain: ${session.icpPain}
- ICP Desire: ${session.icpDesire}
- Business stage: ${session.businessStage}

Respond in ${lang}. Output ONLY this JSON object:
{
  "competitors": [
    { "name": "Competitor name or category", "positioning": "How they position", "weakness": "Their main weakness" }
  ],
  "trends": [
    { "trend": "Trend name", "impact": "How this impacts this brand", "opportunity": "Specific opportunity" }
  ],
  "positioning": "2-3 paragraph positioning opportunity analysis — where this brand can uniquely win in this market",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5", "keyword6", "keyword7", "keyword8"],
  "rawSummary": "3-4 sentence executive summary of the market intelligence"
}

Be specific to ${session.industry} in ${session.country}. Use real market knowledge. Include 3-4 competitors/categories, 3-4 trends, 8 keywords.`

  const raw = await runClaude(prompt)
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) {
    return NextResponse.json({ error: 'Could not parse AI response', raw: raw.slice(0, 500) }, { status: 500 })
  }

  let parsed: {
    competitors: unknown[]; trends: unknown[]
    positioning: string; keywords: string[]; rawSummary: string
  }
  try {
    parsed = JSON.parse(match[0])
  } catch {
    return NextResponse.json({ error: 'Invalid JSON from AI' }, { status: 500 })
  }

  const intel = await db.marketIntelligence.upsert({
    where: { sessionId: id },
    update: {
      competitors: JSON.stringify(parsed.competitors ?? []),
      trends: JSON.stringify(parsed.trends ?? []),
      positioning: parsed.positioning ?? '',
      keywords: JSON.stringify(parsed.keywords ?? []),
      rawSummary: parsed.rawSummary ?? '',
      generatedAt: new Date(),
    },
    create: {
      sessionId: id,
      industry: session.industry,
      country: session.country,
      competitors: JSON.stringify(parsed.competitors ?? []),
      trends: JSON.stringify(parsed.trends ?? []),
      positioning: parsed.positioning ?? '',
      keywords: JSON.stringify(parsed.keywords ?? []),
      rawSummary: parsed.rawSummary ?? '',
    },
  })

  return NextResponse.json(intel)
}

async function runClaude(prompt: string): Promise<string> {
  const spawnEnv = { ...process.env }
  delete spawnEnv['CLAUDECODE']
  delete spawnEnv['CLAUDE_CODE_ENTRYPOINT']
  spawnEnv['HOME'] = 'C:\\Users\\geren'
  spawnEnv['USERPROFILE'] = 'C:\\Users\\geren'
  spawnEnv['APPDATA'] = 'C:\\Users\\geren\\AppData\\Roaming'
  spawnEnv['LOCALAPPDATA'] = 'C:\\Users\\geren\\AppData\\Local'

  const runDir = path.join(os.tmpdir(), `claude-market-${Date.now()}`)
  fs.mkdirSync(runDir, { recursive: true })

  return new Promise((resolve, reject) => {
    const proc = spawn('claude', ['--print', '--dangerously-skip-permissions'], {
      env: spawnEnv, shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: runDir,
    })

    let stdout = ''
    proc.stdout.on('data', (d: Buffer) => { stdout += d.toString() })
    const timer = setTimeout(() => { proc.kill(); reject(new Error('Timeout')) }, 120_000)

    proc.on('close', (code: number) => {
      clearTimeout(timer)
      try { fs.rmSync(runDir, { recursive: true, force: true }) } catch { /* ignore */ }
      if (code !== 0 && !stdout) reject(new Error(`Claude exited ${code}`))
      else resolve(stdout)
    })

    proc.stdin.write(prompt, 'utf8', () => proc.stdin.end())
  })
}
