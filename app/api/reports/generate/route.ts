import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { runClaudeSubprocess } from '@/lib/claude'

function repairJson(raw: string): string {
  // Fix literal newlines inside JSON string values
  return raw.replace(/"([^"]*)"/g, (_match, inner: string) => {
    const fixed = inner.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')
    return `"${fixed}"`
  })
}

function extractJson(raw: string): unknown {
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON object found in Claude response')
  try {
    return JSON.parse(match[0])
  } catch {
    return JSON.parse(repairJson(match[0]))
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { sessionId, month, year } = body as { sessionId: string; month: number; year: number }

  if (!sessionId || !month || !year) {
    return NextResponse.json({ error: 'sessionId, month and year are required' }, { status: 400 })
  }

  // Fetch full session data
  const onboarding = await db.onboardingSession.findUnique({
    where: { id: sessionId },
    include: {
      blueprints: { orderBy: { createdAt: 'desc' }, take: 1 },
      checklist: true,
      proposals: { orderBy: { createdAt: 'desc' } },
      invoices: { orderBy: { createdAt: 'desc' } },
      campaigns: {
        include: {
          pieces: { orderBy: { createdAt: 'desc' } },
        },
        orderBy: { createdAt: 'desc' },
      },
      marketIntelligence: true,
      contentCycles: { orderBy: { cycleNumber: 'desc' } },
    },
  })

  if (!onboarding) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  // Build data summary
  const checklistDone = onboarding.checklist.filter(i => i.completed).length
  const checklistTotal = onboarding.checklist.length

  const latestProposal = onboarding.proposals[0]
  const latestInvoice = onboarding.invoices[0]

  const totalCampaigns = onboarding.campaigns.length
  const activeCampaigns = onboarding.campaigns.filter(c => c.status === 'active').length
  const totalPieces = onboarding.campaigns.reduce((sum, c) => sum + c.pieces.length, 0)
  const publishedPieces = onboarding.campaigns.reduce(
    (sum, c) => sum + c.pieces.filter(p => p.status === 'published').length,
    0,
  )

  const latestCycle = onboarding.contentCycles[0]
  const mi = onboarding.marketIntelligence

  const dataSummary = `
Cliente: ${onboarding.clientName} (${onboarding.brandName || 'sin marca'})
Industria: ${onboarding.industry} | País: ${onboarding.country}
Etapa del negocio: ${onboarding.businessStage}
Descripción del producto: ${onboarding.productDescription}
Precio del producto: $${onboarding.productPrice} USD
Propósito: ${onboarding.purpose}
Valores: ${onboarding.values}
Never list: ${onboarding.neverList}
ICP — Dolor: ${onboarding.icpPain}
ICP — Deseo: ${onboarding.icpDesire}

Checklist de onboarding: ${checklistDone}/${checklistTotal} ítems completados

Propuesta más reciente: ${latestProposal
    ? `Estado ${latestProposal.status}, tier seleccionado: ${latestProposal.selectedTier ?? 'ninguno'}, tier core: $${latestProposal.pricingCore}`
    : 'Ninguna'}

Factura más reciente: ${latestInvoice
    ? `$${latestInvoice.amount} ${latestInvoice.currency}, estado: ${latestInvoice.status}`
    : 'Ninguna'}

Campañas: ${totalCampaigns} total, ${activeCampaigns} activas
Piezas de contenido: ${totalPieces} total, ${publishedPieces} publicadas

Ciclo de contenido más reciente: ${latestCycle
    ? `Ciclo #${latestCycle.cycleNumber}, estado: ${latestCycle.status}, billing ok: ${latestCycle.billingOk}`
    : 'Ninguno'}

Inteligencia de mercado: ${mi
    ? `Industria: ${mi.industry}, posicionamiento: ${mi.positioning?.slice(0, 200)}`
    : 'No generada aún'}

Mes del reporte: ${month}/${year}
`.trim()

  const lang = onboarding.language === 'en' ? 'en' : 'es'

  // ── INTERNAL REPORT PROMPT ──────────────────────────────────────────────
  const internalPrompt = lang === 'en'
    ? `You are Avilion's internal account manager. Write a detailed internal monthly report for this client.

CLIENT DATA:
${dataSummary}

CRITICAL EXECUTION MODE: You are running in a non-interactive pipeline. You MUST NOT use any file tools, write_file, create_file, bash, or any other tools. Do NOT create or modify any files. Your entire response must be a single raw JSON object written directly to stdout — nothing else.

Respond with ONLY a JSON object:
{
  "headline": "one-line internal summary",
  "summary": "3-4 sentences — what happened, what's working, what's at risk",
  "signals": ["completed milestone 1", "completed milestone 2"],
  "risks": ["risk or gap 1", "risk or gap 2"],
  "actionItems": ["team action 1", "team action 2"],
  "sections": [
    {"title": "Strategy Status", "content": "..."},
    {"title": "Content Performance", "content": "..."},
    {"title": "Billing & Proposals", "content": "..."},
    {"title": "Next Month Recommendations", "content": "..."}
  ]
}`
    : `Eres el gerente de cuentas interno de Avilion. Escribe un reporte mensual interno detallado para este cliente.

DATOS DEL CLIENTE:
${dataSummary}

CRITICAL EXECUTION MODE: You are running in a non-interactive pipeline. You MUST NOT use any file tools, write_file, create_file, bash, or any other tools. Do NOT create or modify any files. Your entire response must be a single raw JSON object written directly to stdout — nothing else.

Responde SOLO un objeto JSON:
{
  "headline": "resumen interno en una línea",
  "summary": "3-4 oraciones — qué pasó, qué funciona, qué está en riesgo",
  "signals": ["hito completado 1", "hito completado 2"],
  "risks": ["riesgo o faltante 1", "riesgo o faltante 2"],
  "actionItems": ["acción 1 para el equipo", "acción 2 para el equipo"],
  "sections": [
    {"title": "Estado de Estrategia", "content": "..."},
    {"title": "Rendimiento de Contenido", "content": "..."},
    {"title": "Facturación y Propuestas", "content": "..."},
    {"title": "Recomendaciones para el Próximo Mes", "content": "..."}
  ]
}`

  // ── CLIENT REPORT PROMPT ────────────────────────────────────────────────
  const clientPrompt = lang === 'en'
    ? `Write a warm and professional monthly progress report for the client. Achievements and momentum only — no risks or problems.

CLIENT DATA:
${dataSummary}

CRITICAL EXECUTION MODE: You are running in a non-interactive pipeline. You MUST NOT use any file tools, write_file, create_file, bash, or any other tools. Do NOT create or modify any files. Your entire response must be a single raw JSON object written directly to stdout — nothing else.

Respond with ONLY a JSON object:
{
  "headline": "celebratory one-line summary",
  "summary": "2-3 warm sentences",
  "achievements": ["achievement 1", "achievement 2", "achievement 3"],
  "nextMonthPreview": "2-3 sentences about what's coming",
  "sections": [
    {"title": "Month Highlights", "content": "..."},
    {"title": "Your Brand's Progress", "content": "..."},
    {"title": "What's Coming", "content": "..."}
  ]
}`
    : `Escribe un reporte mensual de progreso cálido y profesional para el cliente. Solo logros y momentum — sin riesgos ni problemas.

DATOS DEL CLIENTE:
${dataSummary}

CRITICAL EXECUTION MODE: You are running in a non-interactive pipeline. You MUST NOT use any file tools, write_file, create_file, bash, or any other tools. Do NOT create or modify any files. Your entire response must be a single raw JSON object written directly to stdout — nothing else.

Responde SOLO un objeto JSON:
{
  "headline": "resumen celebratorio en una línea",
  "summary": "2-3 oraciones cálidas",
  "achievements": ["logro 1", "logro 2", "logro 3"],
  "nextMonthPreview": "2-3 oraciones sobre lo que viene",
  "sections": [
    {"title": "Momentos del Mes", "content": "..."},
    {"title": "El Progreso de Tu Marca", "content": "..."},
    {"title": "Lo Que Viene", "content": "..."}
  ]
}`

  try {
    // Run both Claude subprocesses sequentially (120s each)
    const [internalRaw, clientRaw] = await Promise.all([
      runClaudeSubprocess(internalPrompt, 120_000),
      runClaudeSubprocess(clientPrompt, 120_000),
    ])

    const internalContent = extractJson(internalRaw)
    const clientContent = extractJson(clientRaw)

    // Upsert both reports in a transaction
    const [internalReport, clientReport] = await db.$transaction([
      db.clientReport.upsert({
        where: {
          sessionId_type_month_year: { sessionId, type: 'internal', month, year },
        },
        create: {
          sessionId,
          type: 'internal',
          month,
          year,
          content: JSON.stringify(internalContent),
        },
        update: {
          content: JSON.stringify(internalContent),
          generatedAt: new Date(),
        },
      }),
      db.clientReport.upsert({
        where: {
          sessionId_type_month_year: { sessionId, type: 'client', month, year },
        },
        create: {
          sessionId,
          type: 'client',
          month,
          year,
          content: JSON.stringify(clientContent),
        },
        update: {
          content: JSON.stringify(clientContent),
          generatedAt: new Date(),
        },
      }),
    ])

    return NextResponse.json({ internalReport, clientReport })
  } catch (err) {
    console.error('[reports/generate] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
