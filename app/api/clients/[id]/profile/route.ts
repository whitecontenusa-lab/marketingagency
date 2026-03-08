import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// Fields the team is allowed to update on OnboardingSession (status transitions)
const ALLOWED_STATUS = new Set(['team_done', 'complete'])

// Explicit allowlist — prevents mass assignment of infrastructure flags (giteaFolderCreated, etc.)
const ALLOWED_PROFILE_FIELDS = new Set([
  'icpMicrosegment', 'icpInternalDialogue', 'icpDeepPain', 'icpDeepDesire',
  'icpObjection', 'icpCounterargument', 'emotionalArchetype', 'emotionalArchetypeDesc',
  'audienceArchetype', 'audienceArchetypeDesc', 'archetypeRelationship',
  'contentEmotion', 'contentTransformation', 'contentPillars',
  'voiceAdjectives', 'voiceVocabulary', 'voiceForbidden', 'toneByContext', 'channelFormats',
  'funnelType', 'funnelReason', 'pricingEntry', 'pricingCore', 'pricingPremium', 'valuePromise',
  'gateCanDeliver', 'gateGenuinePurpose', 'gateAutoServesPurpose', 'gateMeasurableResults',
  'gateResult', 'gateDiagnosisNotes', 'initialEmotionalState',
])

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const onboarding = await db.onboardingSession.findUnique({
    where: { id },
    include: { client: { include: { profile: true } } },
  })
  if (!onboarding) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(onboarding)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const teamSession = await getSession()
  if (!teamSession) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const onboarding = await db.onboardingSession.findUnique({ where: { id } })
  if (!onboarding) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Ensure client record exists (create if first team action)
  let client = onboarding.clientId
    ? await db.client.findUnique({ where: { id: onboarding.clientId } })
    : null

  if (!client) {
    client = await db.client.create({
      data: {
        name: onboarding.clientName,
        brandName: onboarding.brandName,
        email: onboarding.email,
        industry: onboarding.industry || 'General',
        country: onboarding.country || 'Colombia',
        language: onboarding.language,
      },
    })
    await db.onboardingSession.update({ where: { id }, data: { clientId: client.id } })
  }

  // Separate status from profile fields; whitelist profile fields to prevent mass assignment
  const { _status } = body
  const profileFields = Object.fromEntries(
    Object.entries(body).filter(([k]) => ALLOWED_PROFILE_FIELDS.has(k))
  )

  try {
    // Check if profile already exists to determine response status
    const existingProfile = await db.clientProfile.findUnique({ where: { clientId: client.id } })

    // Upsert the deep profile
    const profile = await db.clientProfile.upsert({
      where: { clientId: client.id },
      create: { clientId: client.id, ...profileFields },
      update: profileFields,
    })

    // Update session status only when transitioning to 'complete' (gate approved)
    if (_status && ALLOWED_STATUS.has(_status as string)) {
      await db.onboardingSession.update({
        where: { id },
        data: {
          status: _status as string,
          // Only mark agency-approved when fully complete
          agencyReviewApproved: _status === 'complete',
        },
      })
    }

    return NextResponse.json(profile, { status: existingProfile ? 200 : 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}
