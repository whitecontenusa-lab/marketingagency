import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const proposal = await db.proposal.findFirst({ where: { sessionId: id }, orderBy: { version: 'desc' } })
  return NextResponse.json(proposal ?? null)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json()

  // Get next version number
  const last = await db.proposal.findFirst({ where: { sessionId: id }, orderBy: { version: 'desc' } })
  const version = (last?.version ?? 0) + 1

  const proposal = await db.proposal.create({
    data: {
      sessionId: id,
      version,
      diagnosis: body.diagnosis ?? '',
      pricingEntry: Number(body.pricingEntry ?? 0),
      pricingCore: Number(body.pricingCore ?? 0),
      pricingPremium: Number(body.pricingPremium ?? 0),
      notes: body.notes ?? '',
    },
  })
  return NextResponse.json(proposal)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json()

  const proposal = await db.proposal.findFirst({ where: { sessionId: id }, orderBy: { version: 'desc' } })
  if (!proposal) return NextResponse.json({ error: 'No proposal found' }, { status: 404 })

  const data: Record<string, unknown> = {}
  if (body.diagnosis !== undefined) data.diagnosis = body.diagnosis
  if (body.pricingEntry !== undefined) data.pricingEntry = Number(body.pricingEntry)
  if (body.pricingCore !== undefined) data.pricingCore = Number(body.pricingCore)
  if (body.pricingPremium !== undefined) data.pricingPremium = Number(body.pricingPremium)
  if (body.notes !== undefined) data.notes = body.notes
  if (body.selectedTier !== undefined) data.selectedTier = body.selectedTier
  if (body.status !== undefined) {
    data.status = body.status
    if (body.status === 'sent') data.sentAt = new Date()
    if (['accepted', 'rejected', 'ghosted'].includes(body.status)) data.respondedAt = new Date()
  }

  const updated = await db.proposal.update({ where: { id: proposal.id }, data })
  return NextResponse.json(updated)
}
