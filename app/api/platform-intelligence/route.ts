import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

function isInternalRequest(req: NextRequest): boolean {
  const secret = req.headers.get('x-internal-secret')
  return !!secret && secret === process.env.PORTAL_INTERNAL_SECRET
}

// GET /api/platform-intelligence
// Returns all platforms. Team session = all statuses. Internal = all. Public = approved only.
export async function GET(req: NextRequest) {
  const teamSession = await getSession()
  const internal = isInternalRequest(req)
  const { searchParams } = new URL(req.url)
  const platformFilter = searchParams.get('platform')

  const where = teamSession || internal
    ? platformFilter ? { platform: platformFilter } : {}
    : { status: 'approved', ...(platformFilter ? { platform: platformFilter } : {}) }

  const records = await db.platformIntelligence.findMany({
    where,
    orderBy: { platform: 'asc' },
  })

  return NextResponse.json(records)
}

// POST /api/platform-intelligence
// Upsert a single platform intelligence record. Requires internal secret OR team session.
export async function POST(req: NextRequest) {
  const teamSession = await getSession()
  const internal = isInternalRequest(req)
  if (!teamSession && !internal) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const {
    platform,
    algorithmPriorities,
    bestFormats,
    bestFrequency,
    optimalTiming,
    currentTrends,
    avoidList,
    recentChanges,
    emergingFeatures,
    confidence,
  } = body

  if (!platform) return NextResponse.json({ error: 'platform required' }, { status: 400 })

  const record = await db.platformIntelligence.upsert({
    where: { platform },
    update: {
      algorithmPriorities: algorithmPriorities ?? '',
      bestFormats: bestFormats ?? '',
      bestFrequency: bestFrequency ?? '',
      optimalTiming: optimalTiming ?? '',
      currentTrends: currentTrends ?? '',
      avoidList: avoidList ?? '',
      recentChanges: recentChanges ?? '',
      emergingFeatures: emergingFeatures ?? '',
      confidence: confidence ?? 'medium',
      status: 'draft',
      generatedAt: new Date(),
      // Reset approval when re-generated
      approvedAt: null,
      approvedBy: null,
    },
    create: {
      platform,
      algorithmPriorities: algorithmPriorities ?? '',
      bestFormats: bestFormats ?? '',
      bestFrequency: bestFrequency ?? '',
      optimalTiming: optimalTiming ?? '',
      currentTrends: currentTrends ?? '',
      avoidList: avoidList ?? '',
      recentChanges: recentChanges ?? '',
      emergingFeatures: emergingFeatures ?? '',
      confidence: confidence ?? 'medium',
      status: 'draft',
    },
  })

  return NextResponse.json(record)
}
