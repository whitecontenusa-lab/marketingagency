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
  if (!cycle.billingOk) return NextResponse.json({ error: 'Cycle not approved' }, { status: 400 })

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

  const prompt = lang === 'en'
    ? `CRITICAL EXECUTION MODE: You are running in a non-interactive pipeline. Output a single raw JSON array — nothing else. No markdown, no explanation, no code fences.

You are a content strategist creating 30 social media content pieces for a monthly calendar.

BRAND: ${session.brandName || session.clientName}
INDUSTRY: ${session.industry}
PRODUCT: ${String(session.productDescription ?? '').slice(0, 500)}
ICP PAIN: ${session.icpPain}
ICP DESIRE: ${session.icpDesire}
CONTENT STRATEGY:
${contenidoDoc.slice(0, 3000)}

PLATFORMS: ${platformList.join(', ')}

Create exactly 30 content pieces distributed across the platforms. Output ONLY a JSON array:
[{"platform":"instagram","format":"post","hook":"...","body":"...","cta":"...","hashtags":"..."},...]

Requirements per piece:
- hook: max 15 words (scroll-stopping opening)
- body: 3-5 sentences in brand voice
- cta: max 15 words
- hashtags: 5-8 relevant hashtags
- format: post|reel|story|carousel|video|email|article (matching platform)

Output ONLY the JSON array.`
    : `CRITICAL EXECUTION MODE: You are running in a non-interactive pipeline. Output a single raw JSON array — nothing else. No markdown, no explanation, no code fences.

Eres un estratega de contenido creando 30 piezas de contenido para redes sociales del mes.

MARCA: ${session.brandName || session.clientName}
INDUSTRIA: ${session.industry}
PRODUCTO: ${String(session.productDescription ?? '').slice(0, 500)}
DOLOR ICP: ${session.icpPain}
DESEO ICP: ${session.icpDesire}
ESTRATEGIA DE CONTENIDO:
${contenidoDoc.slice(0, 3000)}

PLATAFORMAS: ${platformList.join(', ')}

Crea exactamente 30 piezas de contenido distribuidas entre las plataformas. Responde SOLO un array JSON:
[{"platform":"instagram","format":"post","hook":"...","body":"...","cta":"...","hashtags":"..."},...]

Requisitos por pieza:
- hook: máx 15 palabras (apertura que detiene el scroll)
- body: 3-5 oraciones en la voz de la marca
- cta: máx 15 palabras
- hashtags: 5-8 hashtags relevantes
- format: post|reel|story|carousel|video|email|article (según la plataforma)

Responde SOLO el array JSON.`

  let pieces: Record<string, unknown>[] = []
  try {
    const raw = await runClaudeSubprocess(prompt, 300_000)
    const match = raw.match(/\[[\s\S]*\]/)
    if (!match) throw new Error('No JSON array in response')
    pieces = JSON.parse(match[0])
  } catch (err) {
    await db.contentCycle.update({ where: { id: cycleId }, data: { status: 'approved' } })
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
