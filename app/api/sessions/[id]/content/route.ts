import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const campaignId = searchParams.get('campaignId')
  const pieces = await db.contentPiece.findMany({
    where: { sessionId: id, ...(campaignId ? { campaignId } : {}) },
    orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }],
  })
  return NextResponse.json(pieces)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  // Bulk insert (from AI generation)
  if (Array.isArray(body)) {
    const pieces = await db.$transaction(
      body.map(p =>
        db.contentPiece.create({
          data: {
            sessionId: id,
            campaignId: p.campaignId ?? null,
            platform: p.platform,
            format: p.format,
            hook: p.hook ?? '',
            body: p.body ?? '',
            cta: p.cta ?? '',
            hashtags: p.hashtags ?? '',
            aiGenerated: p.aiGenerated ?? false,
            status: 'draft',
          },
        })
      )
    )
    return NextResponse.json(pieces)
  }

  // Single insert
  const piece = await db.contentPiece.create({
    data: {
      sessionId: id,
      campaignId: body.campaignId ?? null,
      platform: body.platform,
      format: body.format,
      hook: body.hook ?? '',
      body: body.body ?? '',
      cta: body.cta ?? '',
      hashtags: body.hashtags ?? '',
      status: 'draft',
    },
  })
  return NextResponse.json(piece)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { pieceId, ...data } = await req.json()
  const piece = await db.contentPiece.update({
    where: { id: pieceId, sessionId: id },
    data: {
      ...(data.hook !== undefined && { hook: data.hook }),
      ...(data.body !== undefined && { body: data.body }),
      ...(data.cta !== undefined && { cta: data.cta }),
      ...(data.hashtags !== undefined && { hashtags: data.hashtags }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.campaignId !== undefined && { campaignId: data.campaignId }),
      ...(data.scheduledAt !== undefined && { scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null }),
      ...(data.publishedAt !== undefined && { publishedAt: data.publishedAt ? new Date(data.publishedAt) : null }),
    },
  })
  return NextResponse.json(piece)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const pieceId = searchParams.get('pieceId')
  if (!pieceId) return NextResponse.json({ error: 'Missing pieceId' }, { status: 400 })
  await db.contentPiece.delete({ where: { id: pieceId, sessionId: id } })
  return NextResponse.json({ ok: true })
}
