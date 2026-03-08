import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { buildProfileFiles } from '@/lib/templates'
import { createClientRepo, pushProfileFiles } from '@/lib/gitea'

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 50)
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const teamSession = await getSession()
  if (!teamSession) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  let onboarding
  try {
    onboarding = await db.onboardingSession.findUnique({
      where: { id },
      include: { client: { include: { profile: true } } },
    })
  } catch {
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  if (!onboarding) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!onboarding.client) return NextResponse.json({ error: 'Client not linked' }, { status: 400 })

  // Idempotency guard
  if (onboarding.client.profile?.giteaFolderCreated) {
    return NextResponse.json({ ok: true, alreadyDone: true })
  }

  try {
    const files = buildProfileFiles(onboarding as unknown as Record<string, unknown>)
    const slug = slugify(onboarding.clientName || onboarding.client.name)

    const { url, owner } = await createClientRepo(slug)
    await pushProfileFiles(owner, slug, files)

    // Update only giteaFolderCreated on the ClientProfile — no mass assignment
    await db.clientProfile.upsert({
      where: { clientId: onboarding.client.id },
      create: { clientId: onboarding.client.id, giteaFolderCreated: true, giteaFolderPath: url },
      update: { giteaFolderCreated: true, giteaFolderPath: url },
    })

    return NextResponse.json({ ok: true, repoUrl: url })
  } catch (err) {
    console.error('[finalize] Error:', err)
    return NextResponse.json({ error: 'Finalization failed' }, { status: 500 })
  }
}
