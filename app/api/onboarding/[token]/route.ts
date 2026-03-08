import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const session = await db.onboardingSession.findUnique({
    where: { token },
    select: {
      language: true,
      status: true,
      expiresAt: true,
      clientName: true,
      brandName: true,
      email: true,
      whatsapp: true,
      channels: true,
      industry: true,
      country: true,
      productDescription: true,
      productPrice: true,
      businessStage: true,
      monthlyRevenue: true,
      purpose: true,
      values: true,
      neverList: true,
      vision3Years: true,
      icpDemographic: true,
      icpPain: true,
      icpDesire: true,
      agencyContext: true,
      businessType: true,
      revenueModel: true,
      specificProduct: true,
      targetAudience: true,
    },
  })
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (session.expiresAt < new Date()) return NextResponse.json({ error: 'Expired' }, { status: 410 })
  if (session.status === 'client_done') return NextResponse.json({ error: 'Already completed' }, { status: 409 })

  return NextResponse.json(session)
}
