import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { runClaudeSubprocess } from '@/lib/claude'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const teamSession = await getSession()
  if (!teamSession) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { cycleId } = await req.json()

  const cycle = await db.contentCycle.findUnique({
    where: { id: cycleId },
    include: {
      session: {
        include: {
          blueprints: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      },
    },
  })

  if (!cycle) return NextResponse.json({ error: 'Cycle not found' }, { status: 404 })
  if (cycle.sessionId !== id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!cycle.billingOk) return NextResponse.json({ error: 'Cycle not approved' }, { status: 400 })
  if (cycle.status === 'generating') return NextResponse.json({ error: 'Already generating' }, { status: 409 })

  const session = cycle.session
  const blueprint = session.blueprints[0]
  if (!blueprint) return NextResponse.json({ error: 'No blueprint found' }, { status: 400 })

  // Set status to generating
  await db.contentCycle.update({ where: { id: cycleId }, data: { status: 'generating' } })

  // Parse strategy for context
  let strategy: Record<string, unknown> = {}
  try { strategy = JSON.parse(blueprint.contentMd) } catch { /* ignore */ }

  const contenidoDoc = String((strategy.documents as Record<string, unknown>)?.contenido ?? '')
  const channels = session.channels.split(',').filter(Boolean)
  const lang = session.language === 'en' ? 'en' : 'es'
  const platformList = channels.length > 0 ? channels : ['instagram', 'tiktok', 'facebook']

  // Load niche intelligence for ICP vocabulary + differentiation angles
  const niche = await db.nicheIntelligence.findUnique({ where: { sessionId: id } })
  let icpVocabulary: string[] = []
  let icpTriggerWords: string[] = []
  let competitorDiffs: Array<{ competitor: string; ourDiff: string }> = []
  let hookTemplates: Array<{ structure: string; example: string; stage: string }> = []
  let positioningAngle = ''

  if (niche) {
    try { icpVocabulary = JSON.parse(niche.icpVocabulary) } catch { /* ignore */ }
    try { icpTriggerWords = JSON.parse(niche.icpTriggerWords) } catch { /* ignore */ }
    try { competitorDiffs = JSON.parse(niche.competitorDiffs) } catch { /* ignore */ }
    try { hookTemplates = JSON.parse(niche.hookTemplates) } catch { /* ignore */ }
    positioningAngle = niche.positioningAngle
  }

  // Build funnel distribution: 15 TOFU, 10 MOFU, 5 BOFU (assigned in output)
  const funnelDistribution = lang === 'en'
    ? `FUNNEL STAGE DISTRIBUTION (you MUST tag each piece with funnelStage and week):
- 15 pieces tagged "tofu" (awareness, problem education, brand introduction — NO selling)
- 10 pieces tagged "mofu" (consideration, objection handling, case studies, comparisons — light selling)
- 5 pieces tagged "bofu" (decision, offers, testimonials, urgency — direct selling)
- Distribute across 4 weeks: week 1 = 8 pieces, week 2 = 8 pieces, week 3 = 7 pieces, week 4 = 7 pieces`
    : `DISTRIBUCIÓN POR ETAPA DE FUNNEL (DEBES etiquetar cada pieza con funnelStage y week):
- 15 piezas etiquetadas "tofu" (conciencia, educación del problema, introducción de marca — SIN vender)
- 10 piezas etiquetadas "mofu" (consideración, manejo de objeciones, casos de estudio — venta suave)
- 5 piezas etiquetadas "bofu" (decisión, ofertas, testimonios, urgencia — venta directa)
- Distribuidas en 4 semanas: semana 1 = 8 piezas, semana 2 = 8 piezas, semana 3 = 7 piezas, semana 4 = 7 piezas`

  const nicheContext = niche ? (lang === 'en'
    ? `NICHE INTELLIGENCE (use this to write better hooks and body):
ICP exact vocabulary (use these phrases): ${icpVocabulary.slice(0, 3).join(' | ')}
ICP trigger words (use in hooks/CTAs): ${icpTriggerWords.slice(0, 4).join(', ')}
Our positioning angle: ${positioningAngle}
Key differentiations: ${competitorDiffs.slice(0, 2).map(d => d.ourDiff).join(' | ')}
Proven hook templates:
${hookTemplates.slice(0, 3).map(h => `  [${h.stage?.toUpperCase()}] "${h.structure}" → e.g. "${h.example}"`).join('\n')}`
    : `INTELIGENCIA DE NICHO (usa esto para mejores hooks y cuerpos):
Vocabulario exacto del ICP (usa estas frases): ${icpVocabulary.slice(0, 3).join(' | ')}
Palabras disparador del ICP (usa en hooks/CTAs): ${icpTriggerWords.slice(0, 4).join(', ')}
Nuestro ángulo de posicionamiento: ${positioningAngle}
Diferenciaciones clave: ${competitorDiffs.slice(0, 2).map(d => d.ourDiff).join(' | ')}
Plantillas de hooks probadas:
${hookTemplates.slice(0, 3).map(h => `  [${h.stage?.toUpperCase()}] "${h.structure}" → ej. "${h.example}"`).join('\n')}`) : ''

  const prompt = lang === 'en'
    ? `CRITICAL EXECUTION MODE: You are running in a non-interactive pipeline. Output a single raw JSON array — nothing else. No markdown, no explanation, no code fences.

You are a content strategist creating 30 social media content pieces for a monthly calendar.

BRAND: ${session.brandName || session.clientName}
INDUSTRY: ${session.industry}
PRODUCT: ${String(session.productDescription ?? '').slice(0, 500)}
ICP PAIN: ${session.icpPain}
ICP DESIRE: ${session.icpDesire}
CONTENT STRATEGY:
${contenidoDoc.slice(0, 2000)}

PLATFORMS: ${platformList.join(', ')}

${nicheContext}

${funnelDistribution}

Create exactly 30 content pieces. Output ONLY a JSON array where each item includes funnelStage and week:
[{"platform":"instagram","format":"reel","hook":"...","body":"...","cta":"...","hashtags":"...","funnelStage":"tofu","week":1},...]

Requirements per piece:
- hook: max 15 words using ICP trigger words (scroll-stopping opening)
- body: 3-5 sentences in brand voice using ICP vocabulary
- cta: max 15 words aligned to funnelStage (tofu=follow/save, mofu=comment/DM, bofu=buy/book)
- hashtags: 5-8 relevant hashtags
- format: reel|post|carousel|story|video|email|article (best for that platform + funnel stage)
- funnelStage: "tofu" | "mofu" | "bofu" (follow the distribution above)
- week: 1-4

Output ONLY the JSON array.`
    : `CRITICAL EXECUTION MODE: You are running in a non-interactive pipeline. Output a single raw JSON array — nothing else. No markdown, no explanation, no code fences.

Eres un estratega de contenido creando 30 piezas de contenido para redes sociales del mes.

MARCA: ${session.brandName || session.clientName}
INDUSTRIA: ${session.industry}
PRODUCTO: ${String(session.productDescription ?? '').slice(0, 500)}
DOLOR ICP: ${session.icpPain}
DESEO ICP: ${session.icpDesire}
ESTRATEGIA DE CONTENIDO:
${contenidoDoc.slice(0, 2000)}

PLATAFORMAS: ${platformList.join(', ')}

${nicheContext}

${funnelDistribution}

Crea exactamente 30 piezas de contenido. Responde SOLO un array JSON donde cada item incluye funnelStage y week:
[{"platform":"instagram","format":"reel","hook":"...","body":"...","cta":"...","hashtags":"...","funnelStage":"tofu","week":1},...]

Requisitos por pieza:
- hook: máx 15 palabras usando palabras disparador del ICP (apertura que detiene el scroll)
- body: 3-5 oraciones en la voz de la marca usando vocabulario del ICP
- cta: máx 15 palabras alineado al funnelStage (tofu=seguir/guardar, mofu=comentar/DM, bofu=comprar/reservar)
- hashtags: 5-8 hashtags relevantes
- format: reel|post|carousel|story|video|email|article (mejor para esa plataforma + etapa de funnel)
- funnelStage: "tofu" | "mofu" | "bofu" (sigue la distribución arriba)
- week: 1-4

Responde SOLO el array JSON.`

  let pieces: Record<string, unknown>[] = []
  try {
    const raw = await runClaudeSubprocess(prompt, 300_000)
    const match = raw.match(/\[[\s\S]*\]/)
    if (!match) throw new Error('No JSON array in response')
    pieces = JSON.parse(match[0])
  } catch (err) {
    await db.contentCycle.update({ where: { id: cycleId }, data: { status: 'error' } })
    console.error('[content-cycle/generate] Claude failed:', err)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }

  const releasedAt = cycle.deliveryDate ?? new Date(Date.now() + 24 * 60 * 60 * 1000)

  await db.$transaction(
    pieces.slice(0, 30).map(p =>
      db.contentPiece.create({
        data: {
          sessionId: id,
          cycleId,
          platform: String(p.platform ?? 'instagram'),
          format: String(p.format ?? 'post'),
          hook: String(p.hook ?? ''),
          body: String(p.body ?? ''),
          cta: String(p.cta ?? ''),
          hashtags: String(p.hashtags ?? ''),
          aiGenerated: true,
          status: 'ready',
          releasedAt,
          funnelStage: String(p.funnelStage ?? ''),
          week: typeof p.week === 'number' ? p.week : 0,
        },
      })
    )
  )

  await db.contentCycle.update({
    where: { id: cycleId },
    data: { status: 'delivered', generatedAt: new Date() },
  })

  // Email client
  const clientUser = await db.clientUser.findUnique({ where: { sessionId: id } })
  if (clientUser?.email) {
    const { sendContentCycleEmail } = await import('@/lib/mailer')
    sendContentCycleEmail({
      to: clientUser.email,
      clientName: session.clientName,
      cycleNumber: cycle.cycleNumber,
      deliveryDate: releasedAt,
      portalUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/cliente/portal/${id}`,
      language: lang,
    }).catch(e => console.error('[mailer] content cycle email failed:', e))
  }

  return NextResponse.json({ ok: true, count: pieces.slice(0, 30).length })
}
