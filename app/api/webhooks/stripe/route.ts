import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { db } from '@/lib/db'
import { waPaymentConfirmed } from '@/lib/whatsapp'

// Stripe sends raw body — must NOT be parsed by Next.js body parser
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[stripe webhook] STRIPE_WEBHOOK_SECRET not set')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  const sig = req.headers.get('stripe-signature')
  if (!sig) return NextResponse.json({ error: 'No signature' }, { status: 400 })

  const rawBody = await req.text()
  let event: import('stripe').Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
  } catch (err) {
    console.error('[stripe webhook] Signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as import('stripe').Stripe.Checkout.Session

    const { sessionId, cycleId, cycleNumber } = session.metadata ?? {}
    if (!sessionId || !cycleId) {
      console.warn('[stripe webhook] Missing metadata in checkout.session.completed', session.id)
      return NextResponse.json({ ok: true })
    }

    // Mark cycle as paid + auto-approve
    const cycle = await db.contentCycle.findUnique({ where: { id: cycleId } })
    if (!cycle) {
      console.warn('[stripe webhook] Cycle not found:', cycleId)
      return NextResponse.json({ ok: true })
    }

    if (!cycle.billingOk) {
      await db.contentCycle.update({
        where: { id: cycleId },
        data: {
          billingOk: true,
          status: 'approved',
          adminApprovedAt: new Date(),
        },
      })

      // Resolve any open approval queue item for this cycle
      await db.approvalItem.updateMany({
        where: { sessionId, type: 'content_cycle_request', status: 'pending' },
        data: { status: 'approved', decidedAt: new Date(), decisionNote: 'Auto-approved via Stripe payment' },
      })

      // WhatsApp notification
      const onboarding = await db.onboardingSession.findUnique({
        where: { id: sessionId },
        select: { whatsapp: true, clientName: true, language: true },
      })

      if (onboarding?.whatsapp) {
        waPaymentConfirmed({
          phone: onboarding.whatsapp,
          clientName: onboarding.clientName,
          cycleNumber: Number(cycleNumber ?? 1),
          language: onboarding.language,
        }).catch(e => console.error('[stripe webhook] WhatsApp failed:', e))
      }

      console.log(`[stripe webhook] Cycle ${cycleId} paid + approved. Session: ${sessionId}`)
    }
  }

  return NextResponse.json({ ok: true })
}
