import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { githubPushFile, githubConfigured } from '@/lib/github'
import { generateStrategy } from '@/lib/strategy'
import { runClaudeSubprocess } from '@/lib/claude'

/**
 * Fetches existing market intelligence or runs it now (awaited, not fire-and-forget).
 * This ensures interview.json always arrives enriched with market context.
 */
async function ensureMarketIntelligence(
  sessionId: string,
  session: {
    industry: string; country: string; productDescription: string
    productPrice: number; icpPain: string; icpDesire: string
    businessStage: string; language: string
  },
): Promise<Record<string, unknown> | null> {
  const existing = await db.marketIntelligence.findUnique({ where: { sessionId } })
  if (existing) {
    return {
      positioning: existing.positioning,
      rawSummary: existing.rawSummary,
      competitors: (() => { try { return JSON.parse(existing.competitors) } catch { console.warn(`[market-intelligence] Failed to parse competitors JSON for session ${sessionId}`); return [] } })(),
      trends:      (() => { try { return JSON.parse(existing.trends) } catch { console.warn(`[market-intelligence] Failed to parse trends JSON for session ${sessionId}`); return [] } })(),
      keywords:    (() => { try { return JSON.parse(existing.keywords) } catch { console.warn(`[market-intelligence] Failed to parse keywords JSON for session ${sessionId}`); return [] } })(),
    }
  }

  console.log(`[analyze] Auto-running market research for session ${sessionId}`)
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
  "competitors": [{"name":"...","positioning":"...","weakness":"..."}],
  "trends": [{"trend":"...","impact":"...","opportunity":"..."}],
  "positioning": "2-3 paragraph positioning opportunity",
  "keywords": ["kw1","kw2","kw3","kw4","kw5","kw6","kw7","kw8"],
  "rawSummary": "3-4 sentence executive summary"
}

Be specific to ${session.industry} in ${session.country}. Include 3-4 competitors, 3-4 trends, 8 keywords.`

  try {
    const raw = await runClaudeSubprocess(prompt, 120_000)
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return null
    const parsed = JSON.parse(match[0])
    await db.marketIntelligence.create({
      data: {
        sessionId,
        industry: session.industry,
        country: session.country,
        competitors: JSON.stringify(parsed.competitors ?? []),
        trends:      JSON.stringify(parsed.trends ?? []),
        positioning: parsed.positioning ?? '',
        keywords:    JSON.stringify(parsed.keywords ?? []),
        rawSummary:  parsed.rawSummary ?? '',
      },
    })
    return {
      positioning: parsed.positioning ?? '',
      rawSummary:  parsed.rawSummary ?? '',
      competitors: parsed.competitors ?? [],
      trends:      parsed.trends ?? [],
      keywords:    parsed.keywords ?? [],
    }
  } catch (err) {
    console.warn('[analyze] Auto market research failed (non-fatal):', err)
    return null
  }
}

async function enrichWithIntelligence(
  sessionId: string,
  industry: string,
  session: Parameters<typeof ensureMarketIntelligence>[1],
): Promise<{ marketIntelligence: Record<string, unknown> | null; agencyLearnings: string[] }> {
  const [marketIntelligence, learnings] = await Promise.all([
    ensureMarketIntelligence(sessionId, session),
    db.agencyLearning.findMany({ where: { industry }, orderBy: { createdAt: 'desc' }, take: 10 }),
  ])
  return { marketIntelligence, agencyLearnings: learnings.map(l => l.insight) }
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const teamSession = await getSession()
  if (!teamSession) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  if (githubConfigured()) {
    const session = await db.onboardingSession.findUnique({ where: { id } })
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    // B2: Delete existing blueprint so the blueprint route re-polls GitHub
    // after regeneration instead of returning the stale DB version.
    await db.blueprint.deleteMany({ where: { sessionId: id } })

    // B5: Mark session as generating so the team queue and dashboard show correct state
    await db.onboardingSession.update({ where: { id }, data: { status: 'generating' } })

    const slug = (session.brandName || session.clientName)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    const interviewData = {
      sessionId: session.id,
      clientSlug: slug,
      clientName: session.clientName,
      brandName: session.brandName,
      email: session.email,
      language: session.language,
      country: session.country,
      industry: session.industry,
      channels: session.channels,
      productDescription: session.productDescription,
      productPrice: session.productPrice,
      businessStage: session.businessStage,
      monthlyRevenue: session.monthlyRevenue,
      purpose: session.purpose,
      values: session.values,
      neverList: session.neverList,
      vision3Years: session.vision3Years,
      icpDemographic: session.icpDemographic,
      icpPain: session.icpPain,
      icpDesire: session.icpDesire,
      businessType: session.businessType,
      revenueModel: session.revenueModel,
      specificProduct: session.specificProduct,
      targetAudience: session.targetAudience,
      agencyContext: session.agencyContext,
    }

    try {
      // B6: Auto-run market research if not already done, then enrich interview data
      const { marketIntelligence, agencyLearnings } = await enrichWithIntelligence(
        id,
        session.industry,
        session,
      )

      const enrichedData = {
        ...interviewData,
        ...(marketIntelligence ? { marketIntelligence } : {}),
        ...(agencyLearnings.length ? { agencyLearnings } : {}),
      }

      await githubPushFile(
        `clientes/${slug}/interview.json`,
        JSON.stringify(enrichedData, null, 2),
        `analyze: trigger strategy generation for ${session.clientName}`,
      )
      return NextResponse.json({ generating: true, slug })
    } catch (err) {
      // If push failed, reset status to client_done so team can retry.
      // This reset happens BEFORE the local fallback below, so if generateStrategy()
      // succeeds the session ends up in whatever state that function sets — the
      // status is never left stuck at "generating" after a GitHub push failure.
      await db.onboardingSession.update({ where: { id }, data: { status: 'client_done' } })
      console.error('GitHub push failed, falling back to local generation:', err)
    }
  }

  // Fallback: local generation
  try {
    const result = await generateStrategy(id)
    return NextResponse.json(result)
  } catch (err) {
    console.error('Strategy generation failed:', err)
    return NextResponse.json({ error: 'Strategy generation failed' }, { status: 500 })
  }
}
