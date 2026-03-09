import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') ?? 'pending'

  const items = await db.approvalItem.findMany({
    where: { status },
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    include: { session: { select: { clientName: true, brandName: true } } },
  })
  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()

  const item = await db.approvalItem.create({
    data: {
      type: body.type,
      title: body.title,
      description: body.description ?? '',
      context: body.context ?? '',
      priority: body.priority ?? 'normal',
      sessionId: body.sessionId ?? null,
    },
  })
  return NextResponse.json(item)
}

export async function PATCH(req: NextRequest) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { itemId, status, decisionNote } = await req.json()
  const teamSession = await getSession()

  const item = await db.approvalItem.update({
    where: { id: itemId },
    data: {
      status,
      decisionNote: decisionNote ?? '',
      decidedBy: teamSession?.user.email,
      decidedAt: new Date(),
    },
  })
  return NextResponse.json(item)
}
