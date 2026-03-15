import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const teamSession = await getSession()
  if (!teamSession) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  let cycleId: string
  try {
    const body = await req.json()
    cycleId = body.cycleId
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  if (!cycleId) return NextResponse.json({ error: 'cycleId is required' }, { status: 400 })

  const cycle = await db.contentCycle.update({
    where: { id: cycleId },
    data: { billingOk: true, adminApprovedAt: new Date(), status: 'approved' },
  })

  // Resolve any pending approval queue items for this session + type
  await db.approvalItem.updateMany({
    where: { sessionId: id, type: 'content_cycle_request', status: 'pending' },
    data: { status: 'approved', decidedAt: new Date() },
  })

  return NextResponse.json(cycle)
}
