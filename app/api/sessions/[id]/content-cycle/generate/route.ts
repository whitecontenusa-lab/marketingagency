import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { runClaudeSubprocess } from '@/lib/claude'

// ─── Business-type CTA vocabulary ──────────────────────────────────────────────
// These are hard rules — the content generator cannot invent CTAs outside these lists.
const CTA_VOCAB: Record<string, { es: string[]; en: string[] }> = {
  physical_product: {
    es: ['Compra ahora', 'Pide el tuyo', 'Visita nuestra tienda', 'Ordena hoy', 'Link en bio para comprar', 'Disponible en [plataforma]', 'Escríbenos para pedido'],
    en: ['Buy now', 'Order yours today', 'Shop now', 'Link in bio to order', 'Get yours', 'Available at [platform]', 'DM to order'],
  },
  service: {
    es: ['Reserva tu consulta gratuita', 'Escríbenos para cotizar', 'Agenda tu llamada', 'Aplica aquí', 'DM para más info', 'Descubre cómo trabajamos juntos'],
    en: ['Book your free consultation', 'DM for a quote', 'Schedule a call', 'Apply here', 'Message us for details', 'Learn how we work together'],
  },
  digital_product: {
    es: ['Acceso inmediato en el link', 'Compra aquí', 'Descárgalo ahora', 'Consíguelo en el link de bio', 'Únete hoy', 'Inscríbete ahora'],
    en: ['Get instant access', 'Buy now', 'Download it now', 'Link in bio', 'Join today', 'Enroll now'],
  },
  personal_brand: {
    es: ['Sígueme para más', 'Guarda esto', 'Cuéntame en comentarios', 'DM para colaborar', 'Únete a la comunidad', 'Comparte con quien lo necesite'],
    en: ['Follow for more', 'Save this', 'Tell me in the comments', 'DM to collaborate', 'Join the community', 'Share with someone who needs this'],
  },
}

// ─── Social proof rules by stage ───────────────────────────────────────────────
function getSocialProofRule(businessStage: string, monthlyRevenue: number, lang: 'es' | 'en'): string {
  if (businessStage === 'starting' || monthlyRevenue <= 0) {
    return lang === 'en'
      ? `SOCIAL PROOF: ZERO. This brand has NO clients yet (starting stage). NEVER write about client results, "we helped X clients", case studies, revenue numbers, or transformation stories of past clients. Write ONLY about: the product/service features, the problem it solves, the transformation it promises, and the brand's story and values. Do NOT invent any testimonials or results.`
      : `PRUEBA SOCIAL: CERO. Esta marca NO tiene clientes aún (etapa inicial). NUNCA escribas sobre resultados de clientes, "ayudamos a X clientes", casos de estudio, números de ingresos, o historias de transformación de clientes pasados. Escribe SOLO sobre: características del producto/servicio, el problema que resuelve, la transformación que promete, y la historia y valores de la marca. NO inventes testimonios ni resultados.`
  }
  if (businessStage === 'selling') {
    return lang === 'en'
      ? `SOCIAL PROOF: Use sparingly. This brand has some clients but is still growing. You may reference "clients who have used this" in general terms IF the strategy document mentions real testimonials. Do NOT invent specific numbers or names.`
      : `PRUEBA SOCIAL: Usar con moderación. Esta marca tiene algunos clientes pero aún está creciendo. Puedes mencionar "clientes que lo han usado" en términos generales SI el documento de estrategia menciona testimonios reales. NO inventes números específicos ni nombres.`
  }
  return lang === 'en'
    ? `SOCIAL PROOF: Use real data from the strategy document only. Do NOT invent case study numbers or client names not present in the strategy.`
    : `PRUEBA SOCIAL: Usa solo datos reales del documento de estrategia. NO inventes números de casos de estudio ni nombres de clientes que no aparezcan en la estrategia.`
}

// ─── Content type rules by business type ───────────────────────────────────────
function getContentTypeRules(businessType: string, lang: 'es' | 'en'): string {
  const rules: Record<string, { es: string; en: string }> = {
    physical_product: {
      es: `TIPO DE CONTENIDO (producto físico): Cada pieza debe hacer que el cliente quiera COMPRAR EL PRODUCTO. Los pilares son: (1) Educación del producto — qué es, cómo funciona, qué lo hace diferente; (2) Estilo de vida — cómo encaja en la vida del cliente; (3) Historia de marca — por qué existe, quién lo hace; (4) Prueba social — si está disponible. NUNCA posicionar la marca como una agencia o servicio B2B. Este es un producto que se compra directamente.`,
      en: `CONTENT TYPE (physical product): Every piece must make the customer want to BUY THE PRODUCT. Pillars: (1) Product education — what it is, how it works, what makes it different; (2) Lifestyle — how it fits into the customer's life; (3) Brand story — why it exists, who makes it; (4) Social proof — if available. NEVER position the brand as a B2B agency or service provider. This is a product bought directly by consumers.`,
    },
    service: {
      es: `TIPO DE CONTENIDO (servicio): Las piezas deben construir confianza y llevar al cliente a una CONVERSACIÓN o CONSULTA. Los pilares son: (1) Conciencia del problema — amplificar el dolor que el servicio resuelve; (2) Proceso y expertise — cómo trabajas, qué te hace diferente; (3) Transformación — qué cambia en la vida del cliente al trabajar contigo (solo con prueba real); (4) Detrás de escenas — humanizar la marca.`,
      en: `CONTENT TYPE (service): Pieces must build trust and lead the customer to a CONVERSATION or CONSULTATION. Pillars: (1) Problem awareness — amplify the pain the service solves; (2) Process and expertise — how you work, what makes you different; (3) Transformation — what changes in the client's life when working with you (only with real proof); (4) Behind the scenes — humanize the brand.`,
    },
    digital_product: {
      es: `TIPO DE CONTENIDO (producto digital): Las piezas deben llevar al cliente a COMPRAR AHORA (acceso inmediato). Los pilares son: (1) Problema + dolor — por qué necesitan esto; (2) Vista previa del contenido — qué hay dentro, qué aprenderán; (3) Resultados — qué cambia al usarlo (solo con prueba verificada); (4) Autoridad del creador — por qué tú eres el indicado para enseñar esto. Los CTAs deben siempre apuntar a un link de compra.`,
      en: `CONTENT TYPE (digital product): Pieces must lead the customer to BUY NOW (instant access). Pillars: (1) Problem + pain — why they need this; (2) Content preview — what's inside, what they'll learn; (3) Results — what changes after using it (only with verified proof); (4) Creator authority — why you're the right person to teach this. CTAs must always point to a purchase link.`,
    },
    personal_brand: {
      es: `TIPO DE CONTENIDO (marca personal): Las piezas deben posicionar a la PERSONA como una autoridad y construir audiencia leal. Los pilares son: (1) Liderazgo de pensamiento — opiniones, perspectivas únicas, temas de expertise; (2) Historia personal — momentos reales, lecciones aprendidas, vulnerabilidad auténtica; (3) Consejos prácticos — valor accionable directo; (4) Detrás de escenas — vida real, proceso de trabajo, personalidad. NUNCA hablar en plural corporativo ("nosotros"). Siempre en primera persona.`,
      en: `CONTENT TYPE (personal brand): Pieces must position the PERSON as an authority and build a loyal audience. Pillars: (1) Thought leadership — opinions, unique perspectives, expertise topics; (2) Personal story — real moments, lessons learned, authentic vulnerability; (3) Practical tips — direct actionable value; (4) Behind the scenes — real life, work process, personality. NEVER use corporate "we" language. Always first person "I".`,
    },
  }
  const key = businessType in rules ? businessType : 'physical_product'
  return lang === 'en' ? rules[key].en : rules[key].es
}

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

  await db.contentCycle.update({ where: { id: cycleId }, data: { status: 'generating' } })

  // Parse strategy documents
  let strategy: Record<string, unknown> = {}
  try { strategy = JSON.parse(blueprint.contentMd) } catch { /* ignore */ }

  const contenidoDoc = String((strategy.documents as Record<string, unknown>)?.contenido ?? '')
  const perfilDoc = String((strategy.documents as Record<string, unknown>)?.perfil ?? '')
  const channels = session.channels.split(',').filter(Boolean)
  const lang: 'es' | 'en' = session.language === 'en' ? 'en' : 'es'
  const platformList = channels.length > 0 ? channels : ['instagram', 'tiktok', 'facebook']

  // Normalize business type — default to physical_product if missing
  const businessType = session.businessType || 'physical_product'
  const ctaVocab = CTA_VOCAB[businessType]?.[lang] ?? CTA_VOCAB.physical_product[lang]
  const socialProofRule = getSocialProofRule(session.businessStage, session.monthlyRevenue, lang)
  const contentTypeRules = getContentTypeRules(businessType, lang)

  // Load niche intelligence
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

  // ── Step 1: Extract a structured content brief from the strategy ─────────────
  // This is the ANCHOR step. It prevents the AI from misinterpreting the business
  // and ensures all 30 pieces are grounded in the actual product/buyer reality.
  const brandName = session.brandName || session.clientName

  const briefPrompt = lang === 'en'
    ? `CRITICAL EXECUTION MODE: Output a single raw JSON object — nothing else.

You are extracting a content brief from a brand strategy document. Your job is to answer these questions with precision based ONLY on what the strategy says — do NOT invent information.

BRAND: ${brandName}
INDUSTRY: ${session.industry}
BUSINESS TYPE: ${businessType}
PRODUCT/SERVICE: ${session.productDescription || 'Not specified'}
PRODUCT PRICE: $${session.productPrice || 0} USD
BUSINESS STAGE: ${session.businessStage || 'starting'}
MONTHLY REVENUE: $${session.monthlyRevenue || 0} USD
ICP PAIN: ${session.icpPain}
ICP DESIRE: ${session.icpDesire}
ICP DEMOGRAPHIC: ${session.icpDemographic}

CONTENIDO_MADRE DOCUMENT:
${contenidoDoc.slice(0, 3000)}

PERFIL DOCUMENT (first 1000 chars):
${perfilDoc.slice(0, 1000)}

Extract and output ONLY this JSON object:
{
  "exactProduct": "One sentence — what EXACTLY is being sold. E.g.: 'Humos sells cannabis products directly to consumers in Colombia at $20 per unit.'",
  "exactBuyer": "One sentence — who is buying this, their situation, and what they want. E.g.: 'Adults in Colombia who use cannabis for relaxation, stress relief, or medical purposes.'",
  "contentPillars": [
    {"pillar": "Pillar name", "angle": "Specific angle for this brand", "topics": ["specific topic idea 1", "specific topic idea 2"]}
  ],
  "brandVoice": "3-5 adjectives + 1 sentence on tone. E.g.: 'Warm, honest, local, approachable. Speaks like a knowledgeable friend, never like a corporation.'",
  "approvedCTAs": ["CTA that matches this business model exactly", "Second CTA", "Third CTA"],
  "socialProofAvailable": "none | has_testimonials | has_metrics",
  "bannedContent": ["specific content type to avoid", "another banned type"]
}

Be brutally honest. If the strategy is vague, extract what you can and fill gaps with the raw session data. The exactProduct and exactBuyer must reflect REALITY, not marketing fantasy.`
    : `CRITICAL EXECUTION MODE: Output a single raw JSON object — nothing else.

Estás extrayendo un brief de contenido de un documento de estrategia. Tu trabajo es responder estas preguntas con precisión basándote SOLO en lo que dice la estrategia — NO inventes información.

MARCA: ${brandName}
INDUSTRIA: ${session.industry}
TIPO DE NEGOCIO: ${businessType}
PRODUCTO/SERVICIO: ${session.productDescription || 'No especificado'}
PRECIO: $${session.productPrice || 0} USD
ETAPA: ${session.businessStage || 'starting'}
INGRESOS MENSUALES: $${session.monthlyRevenue || 0} USD
DOLOR ICP: ${session.icpPain}
DESEO ICP: ${session.icpDesire}
DEMOGRAFÍA ICP: ${session.icpDemographic}

DOCUMENTO CONTENIDO_MADRE:
${contenidoDoc.slice(0, 3000)}

DOCUMENTO PERFIL (primeros 1000 chars):
${perfilDoc.slice(0, 1000)}

Extrae y responde SOLO este objeto JSON:
{
  "exactProduct": "Una oración — qué se vende EXACTAMENTE. Ej: 'Humos vende productos de cannabis directamente a consumidores en Colombia a $20 la unidad.'",
  "exactBuyer": "Una oración — quién compra esto, su situación, y qué quiere. Ej: 'Adultos en Colombia que usan cannabis para relajación, alivio del estrés o propósitos medicinales.'",
  "contentPillars": [
    {"pillar": "Nombre del pilar", "angle": "Ángulo específico para esta marca", "topics": ["idea de tema específica 1", "idea de tema específica 2"]}
  ],
  "brandVoice": "3-5 adjetivos + 1 oración sobre el tono. Ej: 'Cálida, honesta, local, cercana. Habla como un amigo informado, nunca como una corporación.'",
  "approvedCTAs": ["CTA que encaja exactamente con este modelo de negocio", "Segundo CTA", "Tercer CTA"],
  "socialProofAvailable": "none | has_testimonials | has_metrics",
  "bannedContent": ["tipo de contenido a evitar", "otro tipo prohibido"]
}

Sé brutalmente honesto. Si la estrategia es vaga, extrae lo que puedas y completa los vacíos con los datos de sesión. El exactProduct y exactBuyer deben reflejar la REALIDAD, no la fantasía de marketing.`

  let brief: {
    exactProduct: string
    exactBuyer: string
    contentPillars: Array<{ pillar: string; angle: string; topics: string[] }>
    brandVoice: string
    approvedCTAs: string[]
    socialProofAvailable: string
    bannedContent: string[]
  } | null = null

  try {
    console.log('[content-cycle/generate] Step 1: Extracting content brief...')
    const rawBrief = await runClaudeSubprocess(briefPrompt, 90_000)
    const matchBrief = rawBrief.match(/\{[\s\S]*\}/)
    if (matchBrief) brief = JSON.parse(matchBrief[0])
  } catch (err) {
    console.warn('[content-cycle/generate] Brief extraction failed, continuing with raw data:', err)
  }

  // ── Step 2: Build the 30-piece generation prompt ─────────────────────────────
  const funnelDistribution = lang === 'en'
    ? `FUNNEL STAGE DISTRIBUTION — tag every piece:
- 15 pieces: "tofu" (awareness, education, brand intro — ZERO selling, ZERO urgency)
- 10 pieces: "mofu" (consideration, objection handling — light selling aligned to business type)
- 5 pieces: "bofu" (decision — direct selling using ONLY the approved CTAs below)
- Distribute across 4 weeks: week 1 = 8, week 2 = 8, week 3 = 7, week 4 = 7`
    : `DISTRIBUCIÓN POR ETAPA — etiqueta cada pieza:
- 15 piezas: "tofu" (conciencia, educación, intro de marca — CERO venta, CERO urgencia)
- 10 piezas: "mofu" (consideración, manejo de objeciones — venta suave alineada al tipo de negocio)
- 5 piezas: "bofu" (decisión — venta directa usando SOLO los CTAs aprobados abajo)
- Distribuir en 4 semanas: semana 1 = 8, semana 2 = 8, semana 3 = 7, semana 4 = 7`

  const nicheSection = niche ? (lang === 'en'
    ? `\nNICHE INTELLIGENCE:
ICP exact vocabulary — use these phrases verbatim: ${icpVocabulary.slice(0, 4).join(' | ')}
ICP trigger words — use in hooks and CTAs: ${icpTriggerWords.slice(0, 5).join(', ')}
Unique positioning angle: ${positioningAngle}
Competitive differentiation: ${competitorDiffs.slice(0, 2).map(d => d.ourDiff).join(' | ')}
Proven hook templates:
${hookTemplates.slice(0, 4).map(h => `  [${h.stage?.toUpperCase()}] ${h.structure} → "${h.example}"`).join('\n')}`
    : `\nINTELIGENCIA DE NICHO:
Vocabulario exacto del ICP — usa estas frases textualmente: ${icpVocabulary.slice(0, 4).join(' | ')}
Palabras disparador del ICP — usa en hooks y CTAs: ${icpTriggerWords.slice(0, 5).join(', ')}
Ángulo de posicionamiento único: ${positioningAngle}
Diferenciación competitiva: ${competitorDiffs.slice(0, 2).map(d => d.ourDiff).join(' | ')}
Plantillas de hooks probadas:
${hookTemplates.slice(0, 4).map(h => `  [${h.stage?.toUpperCase()}] ${h.structure} → "${h.example}"`).join('\n')}`) : ''

  const briefSection = brief ? (lang === 'en'
    ? `\nCONTENT BRIEF (extracted from strategy — this is your north star):
WHAT WE SELL: ${brief.exactProduct}
WHO BUYS IT: ${brief.exactBuyer}
BRAND VOICE: ${brief.brandVoice}
CONTENT PILLARS:
${brief.contentPillars.map(p => `  ${p.pillar}: ${p.angle}\n  Topics: ${p.topics.join(', ')}`).join('\n')}
APPROVED CTAs (use ONLY these — do not invent other CTAs):
${(brief.approvedCTAs.length > 0 ? brief.approvedCTAs : ctaVocab).map(c => `  - ${c}`).join('\n')}
DO NOT WRITE:
${brief.bannedContent.map(b => `  - ${b}`).join('\n')}`
    : `\nBRIEF DE CONTENIDO (extraído de la estrategia — este es tu norte):
QUÉ VENDEMOS: ${brief.exactProduct}
QUIÉN COMPRA: ${brief.exactBuyer}
VOZ DE MARCA: ${brief.brandVoice}
PILARES DE CONTENIDO:
${brief.contentPillars.map(p => `  ${p.pillar}: ${p.angle}\n  Temas: ${p.topics.join(', ')}`).join('\n')}
CTAs APROBADOS (usa SOLO estos — no inventes otros CTAs):
${(brief.approvedCTAs.length > 0 ? brief.approvedCTAs : ctaVocab).map(c => `  - ${c}`).join('\n')}
NO ESCRIBIR:
${brief.bannedContent.map(b => `  - ${b}`).join('\n')}`) : ''

  // If brief extraction failed, use approved CTAs from hard-coded vocabulary
  const ctaList = brief?.approvedCTAs?.length ? brief.approvedCTAs : ctaVocab

  const prompt = lang === 'en'
    ? `CRITICAL EXECUTION MODE: Non-interactive pipeline. Output a single raw JSON array — nothing else.

You are creating 30 social media content pieces for ${brandName}.

══════════════════════════════════════
ABSOLUTE RULES — NEVER VIOLATE:
1. NEVER invent client results, case studies, revenue numbers, or testimonials not present in the strategy document.
2. NEVER position this brand as something it is not. If it sells a physical product, ALL content is about BUYING THAT PRODUCT.
3. NEVER use agency-style CTAs ("join our program", "apply for a spot", "book a call") unless this is explicitly a service business.
4. Use ONLY the approved CTAs listed below.
══════════════════════════════════════

BUSINESS TYPE: ${businessType}
BRAND: ${brandName}
INDUSTRY: ${session.industry}
PLATFORMS: ${platformList.join(', ')}

${contentTypeRules}

${socialProofRule}

APPROVED CTAs FOR THIS BUSINESS TYPE:
${ctaList.map(c => `- ${c}`).join('\n')}
${briefSection}
${nicheSection}

${funnelDistribution}

Create exactly 30 content pieces. Output ONLY a JSON array:
[{"platform":"instagram","format":"reel","hook":"...","body":"...","cta":"...","hashtags":"...","funnelStage":"tofu","week":1},...]

Per piece:
- platform: one of [${platformList.join(', ')}]
- format: reel|post|carousel|story|video|email|article (native to that platform)
- hook: max 15 words — scroll-stopping, uses ICP trigger words when available
- body: 3-5 sentences in brand voice — about the ACTUAL product/service, NOT about other clients' results (unless stage allows it)
- cta: use ONLY from the approved CTA list above, max 15 words, aligned to funnelStage
- hashtags: 5-8 relevant hashtags
- funnelStage: "tofu" | "mofu" | "bofu"
- week: 1-4

Output ONLY the JSON array.`
    : `CRITICAL EXECUTION MODE: Pipeline no interactivo. Output un solo array JSON sin nada más.

Estás creando 30 piezas de contenido para redes sociales de ${brandName}.

══════════════════════════════════════
REGLAS ABSOLUTAS — NUNCA VIOLAR:
1. NUNCA inventes resultados de clientes, casos de estudio, números de ingresos, o testimonios que no estén en el documento de estrategia.
2. NUNCA posiciones esta marca como algo que no es. Si vende un producto físico, TODO el contenido es sobre COMPRAR ESE PRODUCTO.
3. NUNCA uses CTAs estilo agencia ("únete a nuestro programa", "aplica para un cupo", "reserva una llamada") a menos que sea explícitamente un negocio de servicios.
4. Usa SOLO los CTAs aprobados listados abajo.
══════════════════════════════════════

TIPO DE NEGOCIO: ${businessType}
MARCA: ${brandName}
INDUSTRIA: ${session.industry}
PLATAFORMAS: ${platformList.join(', ')}

${contentTypeRules}

${socialProofRule}

CTAs APROBADOS PARA ESTE TIPO DE NEGOCIO:
${ctaList.map(c => `- ${c}`).join('\n')}
${briefSection}
${nicheSection}

${funnelDistribution}

Crea exactamente 30 piezas de contenido. Responde SOLO un array JSON:
[{"platform":"instagram","format":"reel","hook":"...","body":"...","cta":"...","hashtags":"...","funnelStage":"tofu","week":1},...]

Por pieza:
- platform: una de [${platformList.join(', ')}]
- format: reel|post|carousel|story|video|email|article (nativo a esa plataforma)
- hook: máx 15 palabras — detiene el scroll, usa palabras disparador del ICP cuando estén disponibles
- body: 3-5 oraciones en la voz de la marca — sobre el PRODUCTO/SERVICIO REAL, NO sobre resultados de otros clientes (salvo que la etapa lo permita)
- cta: usa SOLO de la lista de CTAs aprobados arriba, máx 15 palabras, alineado al funnelStage
- hashtags: 5-8 hashtags relevantes
- funnelStage: "tofu" | "mofu" | "bofu"
- week: 1-4

Responde SOLO el array JSON.`

  let pieces: Record<string, unknown>[] = []
  try {
    console.log('[content-cycle/generate] Step 2: Generating 30 content pieces...')
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
          platform: String(p.platform ?? platformList[0] ?? 'instagram'),
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
