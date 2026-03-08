import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, string>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Either link to an existing client or provide a name
  const clientId = body.clientId?.trim() || null
  let clientName = body.clientName?.trim() || ''

  if (clientId && !clientName) {
    const client = await db.client.findUnique({ where: { id: clientId } })
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    clientName = client.name
  }

  if (!clientName) return NextResponse.json({ error: 'clientId or clientName is required' }, { status: 400 })

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  try {
    const onboarding = await db.onboardingSession.create({
      data: {
        clientId,
        clientName,
        brandName:        body.brandName         || '',
        email:            body.email              || '',
        industry:         body.industry           || '',
        country:          body.country            || '',
        language:         body.language           || 'es',
        businessType:     body.businessType       || '',
        revenueModel:     body.revenueModel       || '',
        specificProduct:  body.specificProduct    || '',
        targetAudience:   body.targetAudience     || '',
        businessStage:    body.businessStage      || '',
        agencyContext:    body.agencyObjective    || body.agencyContext || '',
        expiresAt,
        status: 'pending',
      },
    })

    const origin = req.nextUrl.origin
    const link = `${origin}/onboarding/${onboarding.token}`
    return NextResponse.json({ sessionId: onboarding.id, token: onboarding.token, link }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to create onboarding session' }, { status: 500 })
  }
}
