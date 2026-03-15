import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const teamSession = await getSession()
  if (!teamSession) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const blueprint = await db.blueprint.findFirst({
    where: { sessionId: id },
    orderBy: { createdAt: 'desc' },
  })
  if (!blueprint) return NextResponse.json({ error: 'No blueprint found' }, { status: 404 })

  await db.blueprint.update({
    where: { id: blueprint.id },
    data: { deliveredAt: new Date() },
  })

  return NextResponse.json({ ok: true })
}
