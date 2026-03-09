import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const session = await db.onboardingSession.findUnique({ where: { token } })
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (session.expiresAt < new Date()) return NextResponse.json({ error: 'Expired' }, { status: 410 })
  if (session.status === 'client_done') return NextResponse.json({ ok: true }) // idempotent

  // Mark session complete — strategy generation is triggered separately by the team
  await db.onboardingSession.update({
    where: { token },
    data: { status: 'client_done', completedAt: new Date() },
  })

  return NextResponse.json({ ok: true })
}
