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
  businessType: string,
  session: Parameters<typeof ensureMarketIntelligence>[1],
): Promise<{
  marketIntelligence: Record<string, unknown> | null
  agencyLearnings: string[]
  nicheIntelligence: Record<string, unknown> | null
}> {
  const [marketIntelligence, learnings, existingNiche] = await Promise.all([
    ensureMarketIntelligence(sessionId, session),
    db.agencyLearning.findMany({
      where: businessType
        ? { industry, archetype: { not: undefined } }  // broad filter — can't filter by businessType directly
        : { industry },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    db.nicheIntelligence.findUnique({ where: { sessionId } }),
  ])

  // Return existing niche intel if available (don't regenerate on every analyze)
  let nicheIntelligence: Record<string, unknown> | null = null
  if (existingNiche) {
    nicheIntelligence = {
      icpVocabulary:    (() => { try { return JSON.parse(existingNiche.icpVocabulary) } catch { return [] } })(),
      icpObjections:    (() => { try { return JSON.parse(existingNiche.icpObjections) } catch { return [] } })(),
      icpTriggerWords:  (() => { try { return JSON.parse(existingNiche.icpTriggerWords) } catch { return [] } })(),
      competitorDiffs:  (() => { try { return JSON.parse(existingNiche.competitorDiffs) } catch { return [] } })(),
      positioningAngle: existingNiche.positioningAngle,
      dominantFormats:  (() => { try { return JSON.parse(existingNiche.dominantFormats) } catch { return [] } })(),
      hookTemplates:    (() => { try { return JSON.parse(existingNiche.hookTemplates) } catch { return [] } })(),
    }
  }

  return { marketIntelligence, agencyLearnings: learnings.map(l => l.insight), nicheIntelligence }
}

async function generateBrandBrief(sessionId: string, session: { clientName: string; brandName: string; industry: string; purpose: string; values: string; language: string }) {
  const brandName = session.brandName || session.clientName
  const lang = session.language === 'en' ? 'en' : 'es'
  const prompt = lang === 'en'
    ? `You are a brand identity expert. Based on this brand, create a concise visual identity brief.
Brand: ${brandName}
Industry: ${session.industry}
Purpose: ${session.purpose}
Values: ${session.values}

Output ONLY a JSON object with these keys:
{
  "colorPalette": "3-4 recommended colors with hex codes and emotion they convey",
  "typography": "2 font recommendations (heading + body) and why",
  "brandVoice": "3-5 adjectives describing the brand voice",
  "visualStyle": "2-3 sentences describing the visual aesthetic",
  "logoDirection": "Brief creative direction for logo design"
}`
    : `Eres un experto en identidad visual de marca. Basándote en esta marca, crea un brief visual conciso.
Marca: ${brandName}
Industria: ${session.industry}
Propósito: ${session.purpose}
Valores: ${session.values}

Responde SOLO un objeto JSON con estas claves:
{
  "colorPalette": "3-4 colores recomendados con códigos hex y emoción que transmiten",
  "typography": "2 fuentes recomendadas (titular + cuerpo) y por qué",
  "brandVoice": "3-5 adjetivos que describen la voz de la marca",
  "visualStyle": "2-3 oraciones describiendo la estética visual",
  "logoDirection": "Dirección creativa breve para el diseño del logo"
}`

  const raw = await runClaudeSubprocess(prompt, 60_000)
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON in brand brief response')

  const brief = JSON.parse(match[0])
  const briefText = JSON.stringify(brief, null, 2)

  // Save as checklist item with brief in notes
  const existing = await db.checklistItem.findFirst({
    where: { sessionId, key: 'brand_brief' }
  })
  if (!existing) {
    await db.checklistItem.create({
      data: {
        sessionId,
        key: 'brand_brief',
        label: lang === 'en' ? 'AI Brand Brief (no existing identity)' : 'Brief de marca IA (sin identidad previa)',
        completed: false,
        notes: briefText,
      }
    })
  }

  // Mark as generated
  await db.onboardingSession.update({
    where: { id: sessionId },
    data: { brandBriefGenerated: true },
  })
}

async function generateNicheIntelligence(sessionId: string, session: {
  clientName: string; brandName: string; industry: string; country: string
  channels: string; productDescription: string; icpPain: string; icpDesire: string
  icpDemographic: string; purpose: string; values: string; businessType: string; language: string
}) {
  const lang = session.language === 'en' ? 'English' : 'Spanish'
  const brandName = session.brandName || session.clientName

  // Get competitor context from existing market intel
  const existing = await db.marketIntelligence.findUnique({ where: { sessionId } })
  let competitors: Array<{ name: string; positioning: string; weakness: string }> = []
  if (existing?.competitors) {
    try { competitors = JSON.parse(existing.competitors) } catch { /* ignore */ }
  }
  const competitorList = competitors.map(c => `- ${c.name}: "${c.positioning}" (weakness: ${c.weakness})`).join('\n') || 'Not yet analyzed'
  const channels = session.channels.split(',').filter(Boolean)
  const channelList = channels.length > 0 ? channels.join(', ') : 'instagram, tiktok, facebook'

  const stepAPrompt = `CRITICAL EXECUTION MODE: Non-interactive pipeline. Output a single raw JSON object — nothing else.

You are a consumer psychologist. Deeply profile the ICP for this brand.
BRAND: ${brandName} | INDUSTRY: ${session.industry} | COUNTRY: ${session.country}
PRODUCT: ${session.productDescription}
ICP PAIN: ${session.icpPain} | ICP DESIRE: ${session.icpDesire}
ICP DEMOGRAPHIC: ${session.icpDemographic}

Respond in ${lang}. Output ONLY this JSON:
{"icpVocabulary":["exact phrase ICP uses for their problem","phrase for searching solutions","phrase for desired transformation","phrase in social media posts","phrase when recommending"],"icpObjections":[{"objection":"exact words","rebuttal":"counter in their own language"},{"objection":"second","rebuttal":"counter"},{"objection":"third","rebuttal":"counter"}],"icpTriggerWords":["word that stops scroll","word signaling credibility","word creating urgency","word creating belonging","emotional transformation word"]}`

  const stepBPrompt = `CRITICAL EXECUTION MODE: Non-interactive pipeline. Output a single raw JSON object — nothing else.

You are a competitive strategist. Identify differentiation angles for this brand.
BRAND: ${brandName} | INDUSTRY: ${session.industry} | COUNTRY: ${session.country}
PURPOSE: ${session.purpose} | VALUES: ${session.values}
COMPETITORS:\n${competitorList}

Respond in ${lang}. Output ONLY this JSON:
{"competitorDiffs":[{"competitor":"name/category","theirAngle":"what they emphasize","ourDiff":"how ${brandName} stands out"},{"competitor":"second","theirAngle":"angle","ourDiff":"diff"}],"positioningAngle":"Single sentence: the ONE unique angle ${brandName} should own — specific and competitor-proof","competitiveGap":"2-3 sentences: what NO competitor does that ${brandName} could own"}`

  const stepCPrompt = `CRITICAL EXECUTION MODE: Non-interactive pipeline. Output a single raw JSON object — nothing else.

You are a content format analyst. Identify top-performing content formats in this niche.
BRAND: ${brandName} | INDUSTRY: ${session.industry} | PLATFORMS: ${channelList}

Respond in ${lang}. Output ONLY this JSON:
{"dominantFormats":[{"platform":"instagram","topFormat":"reel","why":"why this format wins in ${session.industry}","avgEngagement":"high"},{"platform":"tiktok","topFormat":"video","why":"why","avgEngagement":"high"}],"hookTemplates":[{"structure":"hook template with [BLANK]","example":"filled example for ${brandName}","stage":"tofu"},{"structure":"second template","example":"example","stage":"tofu"},{"structure":"third","example":"example","stage":"mofu"},{"structure":"fourth","example":"example","stage":"mofu"},{"structure":"fifth","example":"example","stage":"bofu"}]}`

  let stepA: Record<string, unknown> = {}
  let stepB: Record<string, unknown> = {}
  let stepC: Record<string, unknown> = {}

  try { const r = await runClaudeSubprocess(stepAPrompt, 90_000); const m = r.match(/\{[\s\S]*\}/); if (m) stepA = JSON.parse(m[0]) } catch (e) { console.warn('[niche] stepA failed:', e) }
  try { const r = await runClaudeSubprocess(stepBPrompt, 90_000); const m = r.match(/\{[\s\S]*\}/); if (m) stepB = JSON.parse(m[0]) } catch (e) { console.warn('[niche] stepB failed:', e) }
  try { const r = await runClaudeSubprocess(stepCPrompt, 90_000); const m = r.match(/\{[\s\S]*\}/); if (m) stepC = JSON.parse(m[0]) } catch (e) { console.warn('[niche] stepC failed:', e) }

  await db.nicheIntelligence.upsert({
    where: { sessionId },
    update: {
      icpVocabulary:    JSON.stringify(stepA.icpVocabulary ?? []),
      icpObjections:    JSON.stringify(stepA.icpObjections ?? []),
      icpTriggerWords:  JSON.stringify(stepA.icpTriggerWords ?? []),
      competitorDiffs:  JSON.stringify(stepB.competitorDiffs ?? []),
      positioningAngle: String(stepB.positioningAngle ?? ''),
      dominantFormats:  JSON.stringify(stepC.dominantFormats ?? []),
      hookTemplates:    JSON.stringify(stepC.hookTemplates ?? []),
      generatedAt:      new Date(),
    },
    create: {
      sessionId,
      icpVocabulary:    JSON.stringify(stepA.icpVocabulary ?? []),
      icpObjections:    JSON.stringify(stepA.icpObjections ?? []),
      icpTriggerWords:  JSON.stringify(stepA.icpTriggerWords ?? []),
      competitorDiffs:  JSON.stringify(stepB.competitorDiffs ?? []),
      positioningAngle: String(stepB.positioningAngle ?? ''),
      dominantFormats:  JSON.stringify(stepC.dominantFormats ?? []),
      hookTemplates:    JSON.stringify(stepC.hookTemplates ?? []),
    },
  })
  console.log(`[analyze] Niche intelligence saved for session ${sessionId}`)
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
      expertise: session.expertise,
      personalStory: session.personalStory,
      credentialHighlights: session.credentialHighlights,
      contentPillars: session.contentPillars,
      agencyContext: session.agencyContext,
    }

    try {
      // B6: Auto-run market research if not already done, then enrich interview data
      const { marketIntelligence, agencyLearnings, nicheIntelligence } = await enrichWithIntelligence(
        id,
        session.industry,
        session.businessType,
        session,
      )

      // Fire-and-forget: generate niche intelligence if not yet done
      if (!nicheIntelligence) {
        generateNicheIntelligence(id, session).catch(err =>
          console.warn('[analyze] Niche intelligence generation failed (non-fatal):', err)
        )
      }

      // B — Brand brief for clients without branding
      if (!session.hasBranding && !session.brandBriefGenerated) {
        generateBrandBrief(id, session).catch(err =>
          console.warn('[analyze] Brand brief generation failed:', err)
        )
      }

      // Load approved platform intelligence for the client's channels
      const sessionChannels = session.channels.split(',').map(c => c.trim()).filter(Boolean)
      const platformChannels = sessionChannels.length > 0 ? sessionChannels : ['instagram', 'tiktok', 'facebook']
      const platformIntelRecords = await db.platformIntelligence.findMany({
        where: { platform: { in: platformChannels }, status: 'approved' },
      })
      const platformIntelligence = platformIntelRecords.length > 0
        ? platformIntelRecords.map(pi => ({
            platform: pi.platform,
            algorithmPriorities: (() => { try { return JSON.parse(pi.algorithmPriorities) } catch { return [] } })(),
            bestFormats: (() => { try { return JSON.parse(pi.bestFormats) } catch { return [] } })(),
            bestFrequency: pi.bestFrequency,
            currentTrends: (() => { try { return JSON.parse(pi.currentTrends) } catch { return [] } })(),
            avoidList: (() => { try { return JSON.parse(pi.avoidList) } catch { return [] } })(),
            teamNotes: pi.teamNotes,
          }))
        : null

      const enrichedData = {
        ...interviewData,
        ...(marketIntelligence ? { marketIntelligence } : {}),
        ...(agencyLearnings.length ? { agencyLearnings } : {}),
        ...(nicheIntelligence ? { nicheIntelligence } : {}),
        ...(platformIntelligence ? { platformIntelligence } : {}),
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
