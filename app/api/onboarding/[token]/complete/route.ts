import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { githubPushFile, githubConfigured } from '@/lib/github'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const session = await db.onboardingSession.findUnique({ where: { token } })
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (session.expiresAt < new Date()) return NextResponse.json({ error: 'Expired' }, { status: 410 })
  if (session.status === 'client_done') return NextResponse.json({ ok: true }) // idempotent

  // Mark session complete
  await db.onboardingSession.update({
    where: { token },
    data: { status: 'client_done', completedAt: new Date() },
  })

  // Auto-push interview.json to GitHub → triggers GitHub Actions runner → Claude generates strategy
  if (githubConfigured()) {
    const slug = (session.brandName || session.clientName)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    const interviewData = {
      sessionId: session.id,
      clientSlug: slug,
      clientName: session.clientName,
      brandName: session.brandName,
      email: session.email,
      language: session.language,
      country: session.country,
      industry: session.industry,
      channels: session.channels,
      productDescription: session.productDescription,
      productPrice: session.productPrice,
      businessStage: session.businessStage,
      monthlyRevenue: session.monthlyRevenue,
      purpose: session.purpose,
      values: session.values,
      neverList: session.neverList,
      vision3Years: session.vision3Years,
      icpDemographic: session.icpDemographic,
      icpPain: session.icpPain,
      icpDesire: session.icpDesire,
      businessType: session.businessType,
      revenueModel: session.revenueModel,
      specificProduct: session.specificProduct,
      targetAudience: session.targetAudience,
      agencyContext: session.agencyContext,
      completedAt: new Date().toISOString(),
    }

    // Fire and forget — GitHub Action handles the rest autonomously
    githubPushFile(
      `clientes/${slug}/interview.json`,
      JSON.stringify(interviewData, null, 2),
      `onboarding: ${session.clientName} completed interview`,
    ).catch(err => console.error('GitHub push failed:', err))
  }

  return NextResponse.json({ ok: true })
}
