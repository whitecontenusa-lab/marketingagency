import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Fields clients are allowed to update (whitelist to prevent mass assignment)
const ALLOWED_FIELDS = new Set([
  'language', 'clientName', 'brandName', 'email', 'whatsapp', 'channels',
  'industry', 'country', 'productDescription', 'productPrice', 'businessStage',
  'monthlyRevenue', 'purpose', 'values', 'neverList', 'vision3Years', 'icpDemographic',
  'icpPain', 'icpDesire', 'agencyContext', 'businessType', 'revenueModel',
  'specificProduct', 'targetAudience', 'expertise', 'personalStory',
  'credentialHighlights', 'contentPillars',
  'hasBranding', 'brandColors', 'brandFonts', 'brandLogoUrl',
])

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const session = await db.onboardingSession.findUnique({ where: { token } })
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (session.expiresAt < new Date()) return NextResponse.json({ error: 'Expired' }, { status: 410 })
  if (session.status === 'client_done') return NextResponse.json({ error: 'Already completed' }, { status: 409 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Only allow whitelisted fields
  const safeData: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(body)) {
    if (ALLOWED_FIELDS.has(key)) safeData[key] = value
  }

  // Empty payload is valid (e.g. welcome step has no fields to save)
  if (Object.keys(safeData).length === 0) {
    return NextResponse.json({ ok: true })
  }

  try {
    await db.onboardingSession.update({
      where: { token },
      data: safeData,
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}
