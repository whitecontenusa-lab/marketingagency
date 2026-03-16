/**
 * WhatsApp notifications via Twilio WhatsApp Business API.
 * All sends are fire-and-forget — never throws to callers.
 *
 * Required env vars:
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_WHATSAPP_FROM   e.g. "whatsapp:+14155238886"
 */

interface WAMessage {
  to: string          // phone number, e.g. "+573001234567"
  body: string
}

async function send({ to, body }: WAMessage): Promise<void> {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_WHATSAPP_FROM

  if (!sid || !token || !from) return  // Twilio not configured — silently skip

  // Normalize phone: ensure + prefix, strip spaces
  const normalized = to.replace(/\s+/g, '').startsWith('+') ? to.replace(/\s+/g, '') : `+${to.replace(/\s+/g, '')}`

  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`
  const body64 = Buffer.from(`${sid}:${token}`).toString('base64')

  const params = new URLSearchParams({
    From: from.startsWith('whatsapp:') ? from : `whatsapp:${from}`,
    To: `whatsapp:${normalized}`,
    Body: body,
  })

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${body64}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[whatsapp] Twilio error:', res.status, err)
  }
}

// ── Notification templates ────────────────────────────────────────────────────

export async function waStrategyReady({
  phone, clientName, portalUrl, language,
}: { phone: string; clientName: string; portalUrl: string; language: string }) {
  if (!phone) return
  const body = language === 'en'
    ? `Hi ${clientName}! 🎯 Your brand strategy is ready. Log in to your portal to review it: ${portalUrl}`
    : `Hola ${clientName}! 🎯 Tu estrategia de marca está lista. Ingresa a tu portal para revisarla: ${portalUrl}`
  await send({ to: phone, body }).catch(e => console.error('[wa:strategyReady]', e))
}

export async function waContentReady({
  phone, clientName, cycleNumber, portalUrl, language,
}: { phone: string; clientName: string; cycleNumber: number; portalUrl: string; language: string }) {
  if (!phone) return
  const body = language === 'en'
    ? `Hi ${clientName}! 📲 Your 30 content pieces for Cycle #${cycleNumber} are ready in your portal: ${portalUrl}`
    : `Hola ${clientName}! 📲 Tus 30 piezas de contenido del Ciclo #${cycleNumber} están listas en tu portal: ${portalUrl}`
  await send({ to: phone, body }).catch(e => console.error('[wa:contentReady]', e))
}

export async function waInvoiceReady({
  phone, clientName, amount, portalUrl, language,
}: { phone: string; clientName: string; amount: string; portalUrl: string; language: string }) {
  if (!phone) return
  const body = language === 'en'
    ? `Hi ${clientName}! 🧾 You have a new invoice for ${amount}. View it here: ${portalUrl}`
    : `Hola ${clientName}! 🧾 Tienes una nueva factura por ${amount}. Revísala aquí: ${portalUrl}`
  await send({ to: phone, body }).catch(e => console.error('[wa:invoiceReady]', e))
}

export async function waReportReady({
  phone, clientName, month, year, portalUrl, language,
}: { phone: string; clientName: string; month: number; year: number; portalUrl: string; language: string }) {
  if (!phone) return
  const monthName = new Date(year, month - 1).toLocaleString(language === 'en' ? 'en-US' : 'es-CO', { month: 'long' })
  const body = language === 'en'
    ? `Hi ${clientName}! 📊 Your ${monthName} ${year} performance report is ready: ${portalUrl}`
    : `Hola ${clientName}! 📊 Tu reporte de desempeño de ${monthName} ${year} está listo: ${portalUrl}`
  await send({ to: phone, body }).catch(e => console.error('[wa:reportReady]', e))
}

export async function waPaymentConfirmed({
  phone, clientName, cycleNumber, language,
}: { phone: string; clientName: string; cycleNumber: number; language: string }) {
  if (!phone) return
  const body = language === 'en'
    ? `Hi ${clientName}! ✅ Payment confirmed for Cycle #${cycleNumber}. The team will start generating your content shortly.`
    : `Hola ${clientName}! ✅ Pago confirmado para el Ciclo #${cycleNumber}. El equipo comenzará a generar tu contenido pronto.`
  await send({ to: phone, body }).catch(e => console.error('[wa:paymentConfirmed]', e))
}
