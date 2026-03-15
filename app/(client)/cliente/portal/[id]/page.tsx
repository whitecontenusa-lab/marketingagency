import { requireClientSession } from '@/lib/client-auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import ClientPortalView from './ClientPortalView'

export default async function ClientPortalPage({ params }: { params: Promise<{ id: string }> }) {
  const clientSession = await requireClientSession()
  const { id } = await params

  // Enforce that this client can only see their own session
  if (clientSession.client.sessionId !== id) {
    redirect('/cliente/login')
  }

  const session = await db.onboardingSession.findUnique({
    where: { id },
    include: {
      blueprints: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })

  if (!session) redirect('/cliente/login')

  const blueprint = session.blueprints[0] ?? null
  const now = new Date()
  // Backward compat: deliveredAt=null means old blueprint, show immediately
  const isDelivered = !blueprint?.deliveredAt || blueprint.deliveredAt <= now

  let strategy: Record<string, unknown> | null = null
  if (blueprint?.contentMd && isDelivered) {
    try { strategy = JSON.parse(blueprint.contentMd) } catch { /* ignore */ }
  }

  const pendingDeliveredAt = (!isDelivered && blueprint?.deliveredAt)
    ? blueprint.deliveredAt.toISOString()
    : null

  return (
    <ClientPortalView
      sessionId={id}
      clientName={session.clientName}
      brandName={session.brandName}
      approvedAt={blueprint?.agencyApprovedAt?.toISOString() ?? null}
      strategy={strategy}
      language={session.language as 'es' | 'en'}
      deliveredAt={pendingDeliveredAt}
    />
  )
}
