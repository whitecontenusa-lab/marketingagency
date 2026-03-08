import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { githubPushFile, githubConfigured } from '@/lib/github'
import { generateStrategy } from '@/lib/strategy'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const teamSession = await getSession()
  if (!teamSession) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // If GitHub is configured: push interview.json to trigger the self-hosted runner
  if (githubConfigured()) {
    const session = await db.onboardingSession.findUnique({ where: { id } })
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

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
    }

    try {
      await githubPushFile(
        `clientes/${slug}/interview.json`,
        JSON.stringify(interviewData, null, 2),
        `analyze: trigger strategy generation for ${session.clientName}`,
      )
      return NextResponse.json({ generating: true, slug })
    } catch (err) {
      console.error('GitHub push failed, falling back to local generation:', err)
    }
  }

  // Fallback: local generation (mock or direct claude SDK if key is set)
  try {
    const result = await generateStrategy(id)
    return NextResponse.json(result)
  } catch (err) {
    console.error('Strategy generation failed:', err)
    return NextResponse.json({ error: 'Strategy generation failed' }, { status: 500 })
  }
}
