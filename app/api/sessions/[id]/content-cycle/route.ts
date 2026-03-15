import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getClientSession } from '@/lib/client-auth'
import { db } from '@/lib/db'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const teamSession = await getSession()
  const clientSession = !teamSession ? await getClientSession() : null
  if (!teamSession && !clientSession) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // If client session, verify ownership
  if (clientSession && clientSession.client.sessionId !== id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const cycles = await db.contentCycle.findMany({
    where: { sessionId: id },
    orderBy: { cycleNumber: 'desc' },
    include: { _count: { select: { contentPieces: true } } },
  })
  return NextResponse.json(cycles)
}
