import { NextResponse } from 'next/server'
import { getClientSession } from '@/lib/client-auth'
import { db } from '@/lib/db'
import { stripe, stripeEnabled, cyclePriceCents } from '@/lib/stripe'

// POST /api/sessions/[id]/content-cycle/checkout
// Creates a Stripe Checkout session for a pending cycle and returns the URL.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const clientSession = await getClientSession()
  if (!clientSession) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  if (clientSession.client.sessionId !== id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (!stripeEnabled() || !stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  const { cycleId } = await req.json()
  if (!cycleId) return NextResponse.json({ error: 'cycleId required' }, { status: 400 })

  const cycle = await db.contentCycle.findUnique({
    where: { id: cycleId },
    include: { session: { select: { clientName: true, brandName: true, language: true } } },
  })

  if (!cycle) return NextResponse.json({ error: 'Cycle not found' }, { status: 404 })
  if (cycle.sessionId !== id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (cycle.billingOk) return NextResponse.json({ error: 'Already paid' }, { status: 409 })

  const clientUser = await db.clientUser.findUnique({ where: { sessionId: id } })
  if (!clientUser) return NextResponse.json({ error: 'Client user not found' }, { status: 404 })

  const lang = cycle.session.language === 'en' ? 'en' : 'es'
  const brandName = cycle.session.brandName || cycle.session.clientName
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'

  // Get or create Stripe customer
  let customerId = clientUser.stripeCustomerId ?? undefined
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: clientUser.email,
      name: brandName,
      metadata: { sessionId: id, clientUserId: clientUser.id },
    })
    customerId = customer.id
    await db.clientUser.update({
      where: { id: clientUser.id },
      data: { stripeCustomerId: customerId },
    })
  }

  const productName = lang === 'en'
    ? `Content Cycle #${cycle.cycleNumber} — ${brandName}`
    : `Ciclo de Contenido #${cycle.cycleNumber} — ${brandName}`

  const description = lang === 'en'
    ? `30 AI-generated social media content pieces for ${brandName}`
    : `30 piezas de contenido para redes sociales generadas con IA para ${brandName}`

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: [{
      price_data: {
        currency: 'usd',
        unit_amount: cyclePriceCents(),
        product_data: { name: productName, description },
      },
      quantity: 1,
    }],
    success_url: `${baseUrl}/cliente/portal/${id}?payment=success&cycle=${cycleId}`,
    cancel_url: `${baseUrl}/cliente/portal/${id}?payment=cancelled`,
    metadata: {
      sessionId: id,
      cycleId,
      cycleNumber: String(cycle.cycleNumber),
    },
  })

  // Store Stripe session ID on cycle for webhook matching
  await db.contentCycle.update({
    where: { id: cycleId },
    data: { stripeSessionId: checkoutSession.id },
  })

  return NextResponse.json({ url: checkoutSession.url })
}
