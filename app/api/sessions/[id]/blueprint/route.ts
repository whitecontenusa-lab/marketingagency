import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { githubReadFile, githubConfigured } from '@/lib/github'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const teamSession = await getSession()
  if (!teamSession) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // Check local DB first
  const existing = await db.blueprint.findFirst({
    where: { sessionId: id },
    orderBy: { createdAt: 'desc' },
  })
  if (existing) return NextResponse.json(existing)

  // If GitHub is configured, poll for blueprint.json from the Actions runner
  if (githubConfigured()) {
    const session = await db.onboardingSession.findUnique({ where: { id } })
    if (session) {
      const slug = (session.brandName || session.clientName)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')

      const blueprintJson = await githubReadFile(`clientes/${slug}/blueprint.json`)
      if (blueprintJson) {
        // Runner finished — save to local DB and return
        let clientId = session.clientId
        if (!clientId) {
          const newClient = await db.client.create({
            data: {
              name: session.clientName,
              brandName: session.brandName || null,
              email: session.email || null,
              industry: session.industry || 'General',
              country: session.country || 'Colombia',
              language: session.language,
            },
          })
          await db.onboardingSession.update({ where: { id }, data: { clientId: newClient.id } })
          clientId = newClient.id
        }

        const blueprint = await db.blueprint.create({
          data: {
            clientId,
            sessionId: id,
            contentMd: blueprintJson,
            contentHtml: '',
          },
        })
        return NextResponse.json(blueprint)
      }

      // Still generating — tell the dashboard to keep polling
      return NextResponse.json({ generating: true }, { status: 202 })
    }
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}
