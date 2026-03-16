import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { runClaudeSubprocess } from '@/lib/claude'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const intel = await db.nicheIntelligence.findUnique({ where: { sessionId: id } })
  return NextResponse.json(intel)
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const session = await db.onboardingSession.findUnique({
    where: { id },
    include: { marketIntelligence: true },
  })
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  const lang = session.language === 'en' ? 'English' : 'Spanish'
  const brandName = session.brandName || session.clientName

  // Parse existing market intel for competitor context
  let competitors: Array<{ name: string; positioning: string; weakness: string }> = []
  if (session.marketIntelligence?.competitors) {
    try { competitors = JSON.parse(session.marketIntelligence.competitors) } catch { /* ignore */ }
  }
  const competitorList = competitors.map(c => `- ${c.name}: "${c.positioning}" (weakness: ${c.weakness})`).join('\n') || 'Not yet analyzed'

  console.log(`[niche-intelligence] Running 3-step pipeline for ${brandName}`)

  // ── Step A: ICP Psychographic Profile ────────────────────────────────────────
  const stepAPrompt = `CRITICAL EXECUTION MODE: Non-interactive pipeline. Output a single raw JSON object — nothing else.

You are a consumer psychologist specializing in digital marketing. Deeply profile the ICP for this brand.

BRAND: ${brandName}
INDUSTRY: ${session.industry}
COUNTRY: ${session.country}
PRODUCT: ${session.productDescription}
ICP PAIN: ${session.icpPain}
ICP DESIRE: ${session.icpDesire}
ICP DEMOGRAPHIC: ${session.icpDemographic}
BUSINESS TYPE: ${session.businessType || 'not specified'}

Respond in ${lang}. Output ONLY this JSON:
{
  "icpVocabulary": [
    "exact phrase the ICP uses when describing their problem",
    "exact phrase they use when searching for solutions",
    "phrase they use to describe their desired transformation",
    "phrase they use in social media posts about this topic",
    "phrase they use when recommending to friends"
  ],
  "icpObjections": [
    { "objection": "exact words of the objection", "rebuttal": "most effective counter in their own language" },
    { "objection": "second objection", "rebuttal": "counter" },
    { "objection": "third objection", "rebuttal": "counter" }
  ],
  "icpTriggerWords": [
    "word/phrase that makes them stop scrolling",
    "word/phrase that signals credibility to them",
    "word/phrase that creates urgency",
    "word/phrase that creates belonging",
    "emotional word that resonates with their transformation"
  ]
}

Be extremely specific to ${session.industry} in ${session.country}. Use real language this ICP actually uses online, not marketing speak.`

  // ── Step B: Competitive Differentiation ──────────────────────────────────────
  const stepBPrompt = `CRITICAL EXECUTION MODE: Non-interactive pipeline. Output a single raw JSON object — nothing else.

You are a competitive strategist. Identify differentiation angles for this brand.

BRAND: ${brandName}
INDUSTRY: ${session.industry}
COUNTRY: ${session.country}
PRODUCT: ${session.productDescription}
PURPOSE: ${session.purpose}
VALUES: ${session.values}
BUSINESS TYPE: ${session.businessType || 'not specified'}

KNOWN COMPETITORS:
${competitorList}

Respond in ${lang}. Output ONLY this JSON:
{
  "competitorDiffs": [
    { "competitor": "competitor name or category", "theirAngle": "what they emphasize", "ourDiff": "how ${brandName} stands out against them specifically" },
    { "competitor": "second competitor", "theirAngle": "what they emphasize", "ourDiff": "differentiation angle" }
  ],
  "positioningAngle": "Single sentence: the ONE unique angle ${brandName} should own in this market — specific, ownable, competitor-proof. Not a slogan, but a strategic positioning statement.",
  "competitiveGap": "2-3 sentences describing what NO competitor is doing that ${brandName} could own"
}`

  // ── Step C: Platform/Format Intelligence ─────────────────────────────────────
  const channels = session.channels.split(',').filter(Boolean)
  const channelList = channels.length > 0 ? channels.join(', ') : 'instagram, tiktok, facebook'

  const stepCPrompt = `CRITICAL EXECUTION MODE: Non-interactive pipeline. Output a single raw JSON object — nothing else.

You are a content format analyst. Identify what content formats drive the most engagement in this niche.

BRAND: ${brandName}
INDUSTRY: ${session.industry}
COUNTRY: ${session.country}
TARGET PLATFORMS: ${channelList}
ICP PAIN: ${session.icpPain}
BUSINESS TYPE: ${session.businessType || 'not specified'}

Respond in ${lang}. Output ONLY this JSON:
{
  "dominantFormats": [
    { "platform": "instagram", "topFormat": "reel|post|carousel|story", "why": "why this format wins in ${session.industry}", "avgEngagement": "high|medium|low" },
    { "platform": "tiktok", "topFormat": "video", "why": "why", "avgEngagement": "high|medium|low" }
  ],
  "hookTemplates": [
    { "structure": "hook structure (e.g. 'If you [PAIN], then [SHOCKING FACT]')", "example": "filled-in example for ${brandName}", "stage": "tofu|mofu|bofu" },
    { "structure": "second structure", "example": "example", "stage": "tofu|mofu|bofu" },
    { "structure": "third structure", "example": "example", "stage": "tofu|mofu|bofu" },
    { "structure": "fourth structure", "example": "example", "stage": "tofu|mofu|bofu" },
    { "structure": "fifth structure", "example": "example", "stage": "tofu|mofu|bofu" }
  ]
}

Base formats on what actually performs in ${session.industry} on each platform. Make hook templates immediately usable.`

  // ── Run all 3 steps sequentially ─────────────────────────────────────────────
  let stepA: Record<string, unknown> = {}
  let stepB: Record<string, unknown> = {}
  let stepC: Record<string, unknown> = {}

  try {
    console.log('[niche-intelligence] Step A: ICP Psychographic...')
    const rawA = await runClaudeSubprocess(stepAPrompt, 90_000)
    const matchA = rawA.match(/\{[\s\S]*\}/)
    if (matchA) stepA = JSON.parse(matchA[0])
  } catch (err) {
    console.warn('[niche-intelligence] Step A failed (non-fatal):', err)
  }

  try {
    console.log('[niche-intelligence] Step B: Competitive Differentiation...')
    const rawB = await runClaudeSubprocess(stepBPrompt, 90_000)
    const matchB = rawB.match(/\{[\s\S]*\}/)
    if (matchB) stepB = JSON.parse(matchB[0])
  } catch (err) {
    console.warn('[niche-intelligence] Step B failed (non-fatal):', err)
  }

  try {
    console.log('[niche-intelligence] Step C: Platform/Format Audit...')
    const rawC = await runClaudeSubprocess(stepCPrompt, 90_000)
    const matchC = rawC.match(/\{[\s\S]*\}/)
    if (matchC) stepC = JSON.parse(matchC[0])
  } catch (err) {
    console.warn('[niche-intelligence] Step C failed (non-fatal):', err)
  }

  const intel = await db.nicheIntelligence.upsert({
    where: { sessionId: id },
    update: {
      icpVocabulary:   JSON.stringify(stepA.icpVocabulary ?? []),
      icpObjections:   JSON.stringify(stepA.icpObjections ?? []),
      icpTriggerWords: JSON.stringify(stepA.icpTriggerWords ?? []),
      competitorDiffs: JSON.stringify(stepB.competitorDiffs ?? []),
      positioningAngle: String(stepB.positioningAngle ?? ''),
      dominantFormats: JSON.stringify(stepC.dominantFormats ?? []),
      hookTemplates:   JSON.stringify(stepC.hookTemplates ?? []),
      generatedAt:     new Date(),
    },
    create: {
      sessionId:       id,
      icpVocabulary:   JSON.stringify(stepA.icpVocabulary ?? []),
      icpObjections:   JSON.stringify(stepA.icpObjections ?? []),
      icpTriggerWords: JSON.stringify(stepA.icpTriggerWords ?? []),
      competitorDiffs: JSON.stringify(stepB.competitorDiffs ?? []),
      positioningAngle: String(stepB.positioningAngle ?? ''),
      dominantFormats: JSON.stringify(stepC.dominantFormats ?? []),
      hookTemplates:   JSON.stringify(stepC.hookTemplates ?? []),
    },
  })

  console.log(`[niche-intelligence] Complete for ${brandName}`)
  return NextResponse.json(intel)
}
