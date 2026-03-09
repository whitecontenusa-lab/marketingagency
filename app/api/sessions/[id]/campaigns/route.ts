import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const campaigns = await db.campaign.findMany({
    where: { sessionId: id },
    orderBy: { createdAt: 'desc' },
    include: { pieces: { select: { id: true, status: true } } },
  })
  return NextResponse.json(campaigns)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const campaign = await db.campaign.create({
    data: {
      sessionId: id,
      name: body.name,
      objective: body.objective ?? '',
      channels: body.channels ?? '',
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      notes: body.notes ?? '',
    },
  })
  return NextResponse.json(campaign)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { campaignId, ...data } = await req.json()
  const campaign = await db.campaign.update({
    where: { id: campaignId, sessionId: id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.objective !== undefined && { objective: data.objective }),
      ...(data.channels !== undefined && { channels: data.channels }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.startDate !== undefined && { startDate: data.startDate ? new Date(data.startDate) : null }),
      ...(data.endDate !== undefined && { endDate: data.endDate ? new Date(data.endDate) : null }),
    },
  })
  return NextResponse.json(campaign)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const campaignId = searchParams.get('campaignId')
  if (!campaignId) return NextResponse.json({ error: 'Missing campaignId' }, { status: 400 })
  await db.campaign.delete({ where: { id: campaignId, sessionId: id } })
  return NextResponse.json({ ok: true })
}
