import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const invoices = await db.invoice.findMany({ where: { sessionId: id }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json(invoices)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json()

  const invoice = await db.invoice.create({
    data: {
      sessionId: id,
      proposalId: body.proposalId ?? null,
      amount: Number(body.amount),
      currency: body.currency ?? 'USD',
      description: body.description ?? '',
      paymentUrl: body.paymentUrl ?? null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
    },
  })
  return NextResponse.json(invoice)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { invoiceId, status, paymentUrl } = await req.json()

  const invoice = await db.invoice.findFirst({ where: { id: invoiceId, sessionId: id } })
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await db.invoice.update({
    where: { id: invoiceId },
    data: {
      status,
      paymentUrl: paymentUrl ?? invoice.paymentUrl,
      paidAt: status === 'paid' ? new Date() : invoice.paidAt,
    },
  })
  return NextResponse.json(updated)
}
