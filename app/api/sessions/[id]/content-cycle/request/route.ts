import { NextResponse } from 'next/server'
import { getClientSession } from '@/lib/client-auth'
import { db } from '@/lib/db'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const clientSession = await getClientSession()
  if (!clientSession) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  if (clientSession.client.sessionId !== id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Check no active cycle already running
  const existing = await db.contentCycle.findFirst({
    where: { sessionId: id, status: { notIn: ['delivered'] } },
  })
  if (existing) return NextResponse.json({ error: 'Cycle already active', cycle: existing }, { status: 409 })

  const latest = await db.contentCycle.findFirst({
    where: { sessionId: id },
    orderBy: { cycleNumber: 'desc' },
  })
  const cycleNumber = (latest?.cycleNumber ?? 0) + 1

  // Delivery date: 21st of current month if day <= 15, else 21st of next month
  const now = new Date()
  const deliveryMonth = now.getDate() > 15 ? now.getMonth() + 1 : now.getMonth()
  const deliveryYear = deliveryMonth > 11 ? now.getFullYear() + 1 : now.getFullYear()
  const deliveryDate = new Date(deliveryYear, deliveryMonth % 12, 21)

  const cycle = await db.contentCycle.create({
    data: { sessionId: id, cycleNumber, status: 'payment_pending', deliveryDate },
  })

  // Create approval queue item for team
  await db.approvalItem.create({
    data: {
      sessionId: id,
      type: 'content_cycle_request',
      title: `Ciclo de contenido #${cycleNumber} solicitado`,
      description: 'El cliente solicitó su ciclo mensual. Verificar pago y aprobar.',
      priority: 'normal',
    },
  })

  return NextResponse.json(cycle)
}
