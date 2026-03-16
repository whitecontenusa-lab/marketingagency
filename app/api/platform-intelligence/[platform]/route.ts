import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/platform-intelligence/[platform]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  const teamSession = await getSession()
  if (!teamSession) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { platform } = await params
  const record = await db.platformIntelligence.findUnique({ where: { platform } })
  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(record)
}

// PATCH /api/platform-intelligence/[platform]
// Team can: approve, archive, or update teamNotes
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  const teamSession = await getSession()
  if (!teamSession) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { platform } = await params
  const { action, teamNotes } = await req.json()

  const existing = await db.platformIntelligence.findUnique({ where: { platform } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const data: Record<string, unknown> = {}

  if (teamNotes !== undefined) data.teamNotes = teamNotes

  if (action === 'approve') {
    data.status = 'approved'
    data.approvedAt = new Date()
    data.approvedBy = teamSession.user?.email ?? 'team'
  } else if (action === 'archive') {
    data.status = 'archived'
  } else if (action === 'draft') {
    data.status = 'draft'
    data.approvedAt = null
    data.approvedBy = null
  }

  const updated = await db.platformIntelligence.update({ where: { platform }, data })
  return NextResponse.json(updated)
}
