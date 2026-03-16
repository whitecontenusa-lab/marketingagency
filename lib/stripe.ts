import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('[stripe] STRIPE_SECRET_KEY not set — Stripe features disabled')
}

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-02-25.clover' })
  : null

export function stripeEnabled(): boolean {
  return !!stripe
}

/** Price per content cycle in cents (default $299 USD) */
export function cyclePriceCents(): number {
  const env = process.env.CONTENT_CYCLE_PRICE_USD
  return env ? Math.round(parseFloat(env) * 100) : 29900
}

export function cyclePriceDisplay(): string {
  return `$${(cyclePriceCents() / 100).toFixed(2)} USD`
}
