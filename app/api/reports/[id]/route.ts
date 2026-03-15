import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getClientSession } from '@/lib/client-auth'
import { db } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: sessionId } = await params

  const teamSession = await getSession()
  const clientSession = await getClientSession()

  if (!teamSession && !clientSession) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Client session: verify ownership and only return client-type reports
  if (!teamSession && clientSession) {
    if (clientSession.client.sessionId !== sessionId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const reports = await db.clientReport.findMany({
      where: { sessionId, type: 'client' },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    })
    return NextResponse.json(reports)
  }

  // Team session: return all reports
  const reports = await db.clientReport.findMany({
    where: { sessionId },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  })

  return NextResponse.json(reports)
}
