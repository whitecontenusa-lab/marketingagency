import { NextRequest, NextResponse } from 'next/server'
import { getClientSession } from '@/lib/client-auth'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const clientSession = await getClientSession()
  if (!clientSession) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // Ensure this client can only access their own session
  if (clientSession.client.sessionId !== id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const session = await db.onboardingSession.findUnique({
    where: { id },
    include: {
      blueprints: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })

  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const blueprint = session.blueprints[0] ?? null
  let strategy: Record<string, unknown> | null = null
  if (blueprint?.contentMd) {
    try { strategy = JSON.parse(blueprint.contentMd) } catch { /* ignore */ }
  }

  return NextResponse.json({
    clientName: session.clientName,
    brandName: session.brandName,
    status: session.status,
    approvedAt: blueprint?.agencyApprovedAt ?? null,
    strategy,
  })
}
