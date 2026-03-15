import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: sessionId } = await params

  const reports = await db.clientReport.findMany({
    where: { sessionId },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  })

  return NextResponse.json(reports)
}
