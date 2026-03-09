import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/intelligence — extract learnings from an approved session
export async function POST(req: NextRequest) {
  const { sessionId } = await req.json()
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 })

  const session = await db.onboardingSession.findUnique({
    where: { id: sessionId },
    include: { blueprints: { orderBy: { createdAt: 'desc' }, take: 1 } },
  })
  if (!session?.blueprints[0]?.agencyApprovedAt) {
    return NextResponse.json({ error: 'Session not approved' }, { status: 400 })
  }

  const bp = session.blueprints[0]
  let funnelType = 0
  let archetype = ''
  try {
    const strategy = JSON.parse(bp.contentMd)
    funnelType = strategy.funnelType ?? 0
    archetype = strategy.emotionalArchetype ?? ''
  } catch { /* ignore */ }

  if (!funnelType || !archetype) {
    return NextResponse.json({ error: 'Could not parse strategy data' }, { status: 400 })
  }

  // Generate key learnings to store
  const insights = [
    `Industry ${session.industry} in ${session.country} responded to Funnel ${funnelType}`,
    `${archetype} archetype fits ${session.businessStage} stage at $${session.productPrice} price point`,
    `ICP pain "${session.icpPain?.slice(0, 80)}" matched with Funnel ${funnelType}`,
  ].filter(Boolean)

  const upserted: Awaited<ReturnType<typeof db.agencyLearning.upsert>>[] = []
  for (const insight of insights) {
    const record = await db.agencyLearning.upsert({
      where: { sourceId_insight: { sourceId: sessionId, insight } },
      create: {
        industry: session.industry,
        funnelType,
        archetype,
        insight,
        sourceId: sessionId,
      },
      update: {}, // no-op on duplicate
    })
    upserted.push(record)
  }

  return NextResponse.json({ extracted: upserted.length, learnings: upserted })
}

// GET /api/intelligence?industry=X&funnelType=Y — fetch relevant learnings
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const industry = searchParams.get('industry')
  const funnelType = searchParams.get('funnelType')

  const learnings = await db.agencyLearning.findMany({
    where: {
      ...(industry ? { industry } : {}),
      ...(funnelType ? { funnelType: parseInt(funnelType) } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  return NextResponse.json(learnings)
}
