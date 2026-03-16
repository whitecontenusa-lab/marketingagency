import { NextRequest, NextResponse } from 'next/server'
import { getClientSession } from '@/lib/client-auth'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

// PATCH /api/sessions/[id]/content/[pieceId]
// Allows client OR team to update performance metrics on a content piece.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; pieceId: string }> },
) {
  const [clientSession, teamSession] = await Promise.all([getClientSession(), getSession()])
  if (!clientSession && !teamSession) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, pieceId } = await params

  // Client can only update their own pieces
  if (clientSession && clientSession.client.sessionId !== id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const piece = await db.contentPiece.findUnique({ where: { id: pieceId } })
  if (!piece) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (piece.sessionId !== id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const allowed = ['reach', 'impressions', 'engagementRate', 'saves', 'shares', 'scheduledAt', 'status']
  const data: Record<string, unknown> = {}

  for (const key of allowed) {
    if (key in body) data[key] = body[key]
  }

  // Mark metrics update time when performance fields are touched
  const metricsFields = ['reach', 'impressions', 'engagementRate', 'saves', 'shares']
  if (metricsFields.some(f => f in body)) {
    data.metricsUpdatedAt = new Date()
  }

  const updated = await db.contentPiece.update({ where: { id: pieceId }, data })
  return NextResponse.json(updated)
}
