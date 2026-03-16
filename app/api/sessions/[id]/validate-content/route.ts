import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { runClaudeSubprocess } from '@/lib/claude'

interface ValidationResult {
  pieceId: string
  ok: boolean
  violations: string[]
  failedLayers: string[]
  suggestion: string
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

  // Load niche intelligence for voice + market validation layers
  const niche = await db.nicheIntelligence.findUnique({ where: { sessionId: id } })
  let icpVocabulary: string[] = []
  let icpTriggerWords: string[] = []
  let competitorDiffs: Array<{ ourDiff: string }> = []
  let positioningAngle = ''

  if (niche) {
    try { icpVocabulary = JSON.parse(niche.icpVocabulary) } catch { /* ignore */ }
    try { icpTriggerWords = JSON.parse(niche.icpTriggerWords) } catch { /* ignore */ }
    try { competitorDiffs = JSON.parse(niche.competitorDiffs) } catch { /* ignore */ }
    positioningAngle = niche.positioningAngle
  }

  // Parse strategy to get archetype for voice validation
  let emotionalArchetype = ''
  try {
    const blueprint = await db.blueprint.findFirst({
      where: { sessionId: id },
      orderBy: { createdAt: 'desc' },
    })
    if (blueprint?.contentMd) {
      const s = JSON.parse(blueprint.contentMd) as { emotionalArchetype?: string }
      emotionalArchetype = s.emotionalArchetype ?? ''
    }
  } catch { /* ignore */ }

  const nicheContext = niche
    ? `
ICP VOCABULARY (voice must match these phrases and register):
${icpVocabulary.slice(0, 4).join(' | ')}

ICP TRIGGER WORDS (hooks and CTAs should use at least one):
${icpTriggerWords.slice(0, 5).join(', ')}

BRAND POSITIONING ANGLE (content should reinforce this):
${positioningAngle}

COMPETITIVE DIFFERENTIATION (content should avoid copying competitor angles):
${competitorDiffs.slice(0, 2).map(d => `- ${d.ourDiff}`).join('\n')}`
    : ''

  const prompt = `CRITICAL EXECUTION MODE: Output a single raw JSON array — nothing else.

You are the 4-layer brand validator for "${session.brandName || session.clientName}".
Validate each content piece across 4 layers. A piece fails if ANY layer has a violation.

═══════════════════════════════════════════
LAYER 1 — BRAND ETHICS (Never-Do List)
═══════════════════════════════════════════
NEVER DO:
${neverList}

BRAND VALUES:
${values}

═══════════════════════════════════════════
LAYER 2 — FUNNEL ALIGNMENT (CTA vs Stage)
═══════════════════════════════════════════
Rules:
- tofu pieces: CTA must be soft (follow, save, share, comment) — NEVER a purchase/booking CTA
- mofu pieces: CTA can invite DM, download, or light commitment — no hard sell
- bofu pieces: CTA may include buy/book/schedule — direct conversion is expected

═══════════════════════════════════════════
LAYER 3 — BRAND VOICE (ICP Alignment)
═══════════════════════════════════════════
Emotional archetype: ${emotionalArchetype || 'not defined'}
${nicheContext}

Voice check: Does the piece sound like it was written FOR the ICP, using their language?
Flag if: uses corporate jargon, ignores ICP vocabulary, sounds generic or off-brand.

═══════════════════════════════════════════
LAYER 4 — MARKET DIFFERENTIATION
═══════════════════════════════════════════
Positioning angle to reinforce: ${positioningAngle || 'not analyzed'}
Flag if: the piece could have been written by ANY competitor in this industry (no unique angle).

═══════════════════════════════════════════
CONTENT PIECES TO VALIDATE:
${pieces.map(p => `
ID: ${p.id}
Platform: ${p.platform} | Format: ${p.format} | FunnelStage: ${p.funnelStage || 'unknown'} | Week: ${p.week || '?'}
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
    "failedLayers": [],
    "suggestion": ""
  },
  {
    "pieceId": "another piece id",
    "ok": false,
    "violations": ["Layer 1: Hook uses forbidden comparison", "Layer 3: Uses corporate jargon instead of ICP language"],
    "failedLayers": ["brand_ethics", "voice"],
    "suggestion": "Revised hook using ICP trigger words: '...'"
  }
]

failedLayers values: "brand_ethics" | "funnel_alignment" | "voice" | "market_diff"
Be strict but fair. Only flag genuine violations, not minor style preferences.`

  let raw: string
  try {
    raw = await runClaudeSubprocess(prompt, 90_000)
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
