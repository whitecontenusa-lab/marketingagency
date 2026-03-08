import Anthropic from '@anthropic-ai/sdk'
import { db } from '@/lib/db'

const SYSTEM_PROMPT = `You are the Avilion/Humind strategy engine — an expert marketing strategist trained in the 37-ring Marketing 5.0 ecosystem. Your job is to analyze a client's onboarding interview and generate their complete personalized marketing strategy.

You have deep expertise in:
- Emotional marketing and audience psychology
- Funnel architecture and conversion optimization
- Brand soul and purpose-driven positioning
- Content strategy and multi-channel distribution
- Latin American and international markets

## THE 4 FUNNEL TYPES

Select the most appropriate funnel based on businessStage, product price, and audience:

**Funnel 1 — Awareness & Trust (Conciencia y Confianza)**
- Use when: businessStage = starting, OR price < $50, OR "no lo tengo" in ICP answers
- Goal: Build audience and first conversions from zero
- Key rings: Ring 1 (Core), Ring 6 (Emotional), Ring 2 (Distribution)
- Strategy: Educational content → micro-offer → community

**Funnel 2 — Authority & Conversion (Autoridad y Conversión)**
- Use when: businessStage = selling, price $50-$500, has some ICP clarity
- Goal: Scale existing sales with authority content
- Key rings: Ring 17-BIS (Funnels), Ring 12 (Custody), Ring 26 (Attention)
- Strategy: Case studies → lead magnet → direct offer

**Funnel 3 — Premium & Relationship (Premium y Relación)**
- Use when: price > $500, service-based, personal brand
- Goal: High-ticket clients through deep trust
- Key rings: Ring 1 (Core), Ring 26 (Attention), Ring 6 (Emotional)
- Strategy: Long-form content → application → consultation

**Funnel 4 — Scale & Automation (Escala y Automatización)**
- Use when: businessStage = scaling, has proven offer, existing revenue
- Goal: Systematize and scale proven acquisition
- Key rings: All rings at Phase 2-3 activation
- Strategy: Paid + organic → automated sequences → upsell

## THE 7 EMOTIONAL ARCHETYPES

Assign one based on purpose and values:
1. El Constructor — builds tangible things, practical results
2. El Guardián — protects, preserves, ensures safety
3. El Explorador — adventures, discovers, pioneers new paths
4. El Sanador — heals, restores, supports recovery
5. El Maestro — teaches, shares knowledge, elevates others
6. El Creador — creates beauty, art, original expression
7. El Conector — builds community, bridges people and ideas

## OUTPUT FORMAT

Respond ONLY with a valid JSON object. No markdown, no explanation, just the JSON:

{
  "lang": "es or en matching the client's language",
  "funnelType": 1,
  "funnelReason": "2-3 sentence explanation of why this funnel was chosen based on their specific situation",
  "emotionalArchetype": "El Constructor",
  "emotionalArchetypeReason": "Why this archetype fits",
  "simulationNotes": "3-4 paragraph market analysis: industry context in their country, competitive landscape, opportunity size, key risks, specific recommendations based on their location and stage",
  "documents": {
    "perfil": "Complete PERFIL.md document content here — minimum 500 words. Include: Propósito, Producto/Servicio, ICP detallado (quién es + dolor + deseo), Visión, Arquetipo Emocional, Promesa de Valor, Lista de Nunca.",
    "funnel": "Complete FUNNEL.md document content here — minimum 500 words. Include: Por qué este funnel, estructura TOFU/MOFU/BOFU con tácticas específicas, métricas clave, siguiente paso inmediato.",
    "contenido": "Complete CONTENIDO_MADRE.md document content here — minimum 500 words. Include: 4 pilares de contenido con ejemplos reales de posts, voz de marca, calendario editorial, formatos por canal.",
    "itr": "Complete ITR.md document content here — minimum 400 words. Include: 6 capas de indicadores con pesos, metas numéricas específicas basadas en los datos del cliente, proceso de check-in mensual.",
    "roadmap": "Complete PLAN_90_DIAS.md document content here — minimum 600 words. Include: Fase 1 (días 1-30) Fundación, Fase 2 (días 31-60) Autoridad, Fase 3 (días 61-90) Escala. Cada fase con acciones semanales en checklist format (- [ ] acción), metas numéricas, y decisiones clave a tomar."
  }
}`

function buildUserPrompt(session: Record<string, unknown>): string {
  return `Analyze this client and generate their complete strategy.

CLIENT INTERVIEW DATA:
- Name: ${session.clientName}
- Brand: ${session.brandName || 'Not defined yet'}
- Country: ${session.country}
- Industry: ${session.industry}
- Language preference: ${session.language}
- Active channels: ${session.channels}

BUSINESS:
- Product/Service: ${session.productDescription}
- Price: $${session.productPrice} USD
- Business stage: ${session.businessStage}
- Monthly revenue: $${session.monthlyRevenue} USD

BRAND SOUL:
- Purpose: ${session.purpose}
- Values: ${session.values}
- Never list: ${session.neverList}

AUDIENCE:
- Who they are: ${session.icpDemographic}
- Their biggest pain: ${session.icpPain}
- What they desire: ${session.icpDesire}

VISION:
- 3-year vision: ${session.vision3Years}

AGENCY CONTEXT (internal — do not expose to client):
- Business type: ${session.businessType}
- Revenue model: ${session.revenueModel}
- Specific product: ${session.specificProduct}
- Target audience (agency view): ${session.targetAudience}
- Agency objective: ${session.agencyContext}

Generate the complete strategy. All documents must be in ${session.language === 'en' ? 'English' : 'Spanish'}.
The simulation notes should include specific market insights for ${session.industry} in ${session.country}.
Be specific, actionable, and grounded in their actual answers.

IMPORTANT:
- If the ICP answer is weak, vague, or says "no lo tengo/don't know", generate an intelligent ICP suggestion based on the industry and mark it as "(perfil sugerido por el ecosistema)"
- All 5 documents (perfil, funnel, contenido, itr, roadmap) are REQUIRED in the response
- roadmap must use markdown checkbox format (- [ ] action) for all weekly tasks
- Use the client's actual words from their interview wherever possible`
}

function buildMockStrategy(session: Record<string, unknown>): string {
  const lang = String(session.language ?? 'es')
  const isEs = lang !== 'en'
  const stage = String(session.businessStage ?? 'starting')
  const price = Number(session.productPrice ?? 0)

  // Select funnel based on data
  let funnelType = 1
  if (stage === 'scaling') funnelType = 4
  else if (stage === 'selling' && price > 500) funnelType = 3
  else if (stage === 'selling') funnelType = 2

  // A) Safe name helper
  const brand = String(session.brandName || session.clientName || 'Tu marca')
  const firstName = String(session.clientName || '').split(' ')[0] || 'Tu cliente'

  const industry = String(session.industry ?? '')
  const country = String(session.country ?? '')
  const purpose = String(session.purpose ?? '')
  const product = String(session.productDescription ?? '')
  const icpPain = String(session.icpPain ?? '')
  const icpDesire = String(session.icpDesire ?? '')
  const icpDemographic = String(session.icpDemographic ?? '')
  const vision = String(session.vision3Years ?? '')
  const channels = String(session.channels ?? '')
  const primaryChannel = channels.split(',').filter(Boolean)[0] || 'instagram'

  const funnelNames: Record<number, string> = {
    1: isEs ? 'Conciencia y Confianza' : 'Awareness & Trust',
    2: isEs ? 'Autoridad y Conversión' : 'Authority & Conversion',
    3: isEs ? 'Premium y Relación' : 'Premium & Relationship',
    4: isEs ? 'Escala y Automatización' : 'Scale & Automation',
  }

  // B) ICP intelligence helpers
  function interpretIcp(demographic: string, ind: string, _isEs: boolean): string {
    const weak = ['no lo tengo', 'no se', 'no sé', 'nadie', 'todos', 'everyone', "don't know", 'n/a', '']
    const isWeak = weak.some(w => demographic.toLowerCase().trim().includes(w)) || demographic.trim().length < 10
    if (!isWeak) return demographic

    const suggestions: Record<string, string> = {
      shampoo: _isEs ? 'Mujeres de 25-45 años interesadas en el cuidado natural del cabello, con poder adquisitivo medio, activas en Instagram y TikTok' : 'Women 25-45 interested in natural hair care, middle income, active on Instagram and TikTok',
      cabello: _isEs ? 'Mujeres de 25-45 años que buscan soluciones para problemas capilares (caída, sequedad, frizz), activas en redes sociales' : 'Women 25-45 seeking solutions for hair problems, active on social media',
      default: _isEs ? 'Personas de 28-45 años con un problema concreto relacionado a tu industria, activas en al menos 2 redes sociales, dispuestas a invertir en soluciones' : 'People 28-45 with a specific problem related to your industry, active on social media, willing to invest in solutions'
    }

    const key = Object.keys(suggestions).find(k => ind.toLowerCase().includes(k)) || 'default'
    return `${suggestions[key]} *(perfil sugerido por el ecosistema — refinar con datos reales)*`
  }

  function interpretDesire(desire: string, prod: string, _isEs: boolean): string {
    const weak = ['vender', 'sell', 'ganar', 'earn', 'dinero', 'money', 'crecer', 'grow']
    const isWeak = desire.trim().length < 15 || weak.some(w => desire.toLowerCase().trim() === w)
    if (!isWeak) return desire
    return _isEs
      ? `Alcanzar estabilidad económica a través de ${prod}, sintiéndose seguro/a de su oferta y reconocido/a en su mercado`
      : `Achieve financial stability through ${prod}, feeling confident in their offer and recognized in their market`
  }

  // C) Rich simulation notes
  function buildSimulation(ind: string, ctry: string, stg: string, chs: string, prc: number, _isEs: boolean): string {
    const ch = chs.split(',').filter(Boolean)
    const primCh = ch[0] || 'instagram'
    const channelCount = ch.length

    const industryInsights: Record<string, { es: string; en: string }> = {
      shampoo: {
        es: `El mercado de cuidado capilar en ${ctry} mueve más de $500M USD anuales y crece 8% año a año. La demanda de productos naturales y sin sulfatos aumentó 34% en 2024. El consumidor latinoamericano investiga en redes sociales antes de comprar — el 73% toma la decisión en Instagram o TikTok.`,
        en: `The hair care market in ${ctry} moves over $500M USD annually and grows 8% year over year. Demand for natural and sulfate-free products increased 34% in 2024. Latin American consumers research on social media before buying — 73% make their decision on Instagram or TikTok.`,
      },
      cabello: {
        es: `El mercado de cuidado capilar en ${ctry} mueve más de $500M USD anuales y crece 8% año a año. La demanda de productos naturales y sin sulfatos aumentó 34% en 2024. El consumidor latinoamericano investiga en redes sociales antes de comprar — el 73% toma la decisión en Instagram o TikTok.`,
        en: `The hair care market in ${ctry} moves over $500M USD annually and grows 8% year over year.`,
      },
      default: {
        es: `El mercado de ${ind} en ${ctry} tiene una penetración digital creciente. El 68% de los consumidores latinoamericanos descubre nuevas marcas a través de redes sociales. Las marcas que publican contenido educativo consistente generan 3x más confianza que las que solo publican promociones.`,
        en: `The ${ind} market in ${ctry} has growing digital penetration. 68% of Latin American consumers discover new brands through social media. Brands that publish consistent educational content generate 3x more trust than those that only post promotions.`,
      }
    }

    const key = Object.keys(industryInsights).find(k => ind.toLowerCase().includes(k)) || 'default'
    const insight = industryInsights[key][_isEs ? 'es' : 'en']

    return _isEs
      ? `${insight}

**Oportunidad de posicionamiento:** Con ${channelCount} canales activos y un precio de $${prc} USD, la estrategia debe enfocarse en construir autoridad en ${primCh} primero. El error más común en etapa "${stg}" es dispersarse en todos los canales simultáneamente — la concentración en uno genera resultados 4x más rápido.

**Riesgo principal:** La competencia de marcas establecidas con mayor presupuesto de pauta. La ventaja competitiva en esta etapa es la autenticidad y la conexión directa con la audiencia — algo que las marcas grandes no pueden replicar fácilmente.

**Recomendación táctica:** Los primeros 30 días deben generar contenido de valor sin vender. Los días 31-60, introducir la oferta suavemente. Los días 61-90, activar conversión directa con evidencia social acumulada.`
      : `${insight}

**Positioning opportunity:** With ${channelCount} active channels and a $${prc} USD price point, the strategy should focus on building authority on ${primCh} first. The most common mistake at "${stg}" stage is spreading across all channels simultaneously — concentration on one generates results 4x faster.

**Main risk:** Competition from established brands with larger ad budgets. The competitive advantage at this stage is authenticity and direct audience connection — something big brands can't easily replicate.

**Tactical recommendation:** First 30 days: generate value content without selling. Days 31-60: introduce the offer softly. Days 61-90: activate direct conversion with accumulated social proof.`
  }

  // D) 90-day roadmap builder
  function buildRoadmap(stg: string, prod: string, primCh: string, prc: number, _isEs: boolean): string {
    return _isEs
      ? `# PLAN DE ACCIÓN — 90 DÍAS

## Fase 1: Fundación (Días 1-30)
**Objetivo:** Establecer presencia y voz de marca sin vender todavía.

### Semana 1-2
- [ ] Optimizar perfil de ${primCh}: bio, foto, enlace, destacados
- [ ] Definir los 3 pilares de contenido principales
- [ ] Crear 10 piezas de contenido educativo sobre el problema del ICP
- [ ] Publicar 1 contenido de "por qué existe esta marca"

### Semana 3-4
- [ ] Publicar 5 posts de valor puro (sin mencionar el producto)
- [ ] Iniciar engagement activo: comentar en 10 cuentas del nicho diariamente
- [ ] Crear lista de emails/WhatsApp con primeros contactos interesados
- [ ] Documentar todo en formato "detrás de cámaras"

**Meta de Fase 1:** +200 seguidores genuinos, 10 conversaciones reales iniciadas

---

## Fase 2: Autoridad (Días 31-60)
**Objetivo:** Introducir la oferta mientras se sigue educando.

### Semana 5-6
- [ ] Publicar primer caso de resultado (puede ser tuyo propio)
- [ ] Crear lead magnet gratuito relacionado al dolor del ICP
- [ ] Lanzar primera oferta a lista caliente con precio especial de fundador
- [ ] Iniciar recolección de testimonios (aunque sean de conocidos)

### Semana 7-8
- [ ] Crear contenido de "¿para quién es y para quién NO es?" el producto
- [ ] Activar secuencia de WhatsApp/email para leads del lead magnet
- [ ] Primera venta o validación de la oferta a precio real: $${prc} USD
- [ ] Ajustar oferta según feedback real de los primeros interesados

**Meta de Fase 2:** 3-5 clientes o ventas confirmadas, testimonio documentado

---

## Fase 3: Escala (Días 61-90)
**Objetivo:** Sistematizar lo que funciona y aumentar volumen.

### Semana 9-10
- [ ] Identificar el contenido con mejor rendimiento y crear variaciones
- [ ] Activar primer anuncio pagado con $50-100 USD de presupuesto de prueba
- [ ] Crear proceso de onboarding para nuevos clientes
- [ ] Documentar el funnel que está funcionando

### Semana 11-12
- [ ] Revisar métricas ITR del primer trimestre
- [ ] Tomar decisión: ¿escalar pauta, agregar canal secundario, o mejorar conversión?
- [ ] Planificar siguiente trimestre con datos reales
- [ ] Reunión de revisión con equipo Avilion

**Meta de Fase 3:** Proceso de adquisición repetible, ITR ≥ 70%

---
*Plan generado por el Motor Estratégico Avilion/Humind*`
      : `# 90-DAY ACTION PLAN

## Phase 1: Foundation (Days 1-30)
**Goal:** Establish presence and brand voice without selling yet.

### Week 1-2
- [ ] Optimize ${primCh} profile: bio, photo, link, highlights
- [ ] Define the 3 main content pillars
- [ ] Create 10 educational pieces about the ICP's problem
- [ ] Publish 1 "why this brand exists" content piece

### Week 3-4
- [ ] Publish 5 pure value posts (without mentioning the product)
- [ ] Start active engagement: comment on 10 niche accounts daily
- [ ] Build email/WhatsApp list with first interested contacts
- [ ] Document everything in "behind the scenes" format

**Phase 1 Goal:** +200 genuine followers, 10 real conversations started

---

## Phase 2: Authority (Days 31-60)
**Goal:** Introduce the offer while continuing to educate.

### Week 5-6
- [ ] Publish first result case (can be your own)
- [ ] Create free lead magnet related to ICP pain
- [ ] Launch first offer to warm list with founder special price
- [ ] Start collecting testimonials

### Week 7-8
- [ ] Create "who it's for and who it's NOT for" content
- [ ] Activate WhatsApp/email sequence for lead magnet leads
- [ ] First sale or offer validation at real price: $${prc} USD

**Phase 2 Goal:** 3-5 confirmed clients or sales

---

## Phase 3: Scale (Days 61-90)
**Goal:** Systematize what works and increase volume.

### Week 9-12
- [ ] Identify best-performing content and create variations
- [ ] Activate first paid ad with $50-100 USD test budget
- [ ] Review first-quarter ITR metrics
- [ ] Plan next quarter with real data

**Phase 3 Goal:** Repeatable acquisition process, ITR ≥ 70%

---
*Generated by Avilion/Humind Strategy Engine*`
  }

  // E) Fix the value promise placeholder — derive from ICP data
  const interpretedIcp = interpretIcp(icpDemographic, industry, isEs)
  const icpShort = interpretedIcp.split(',')[0].split('(')[0].trim().slice(0, 40) || (isEs ? 'tu cliente ideal' : 'your ideal client')
  const interpretedDesire = interpretDesire(icpDesire, product, isEs)
  const transformation = interpretedDesire.split(' ').slice(0, 8).join(' ')
  const valuePromise = isEs
    ? `Ayudamos a ${icpShort} a ${transformation} a través de ${product} de calidad comprobada.`
    : `We help ${icpShort} achieve ${transformation} through proven-quality ${product}.`

  // Suppress unused variable warning
  void firstName

  return JSON.stringify({
    lang,
    funnelType,
    funnelReason: isEs
      ? `${brand} está en etapa "${stage}" con un precio de $${price} USD. El Funnel ${funnelType} (${funnelNames[funnelType]}) es el más adecuado para construir la base necesaria antes de escalar.`
      : `${brand} is at "${stage}" stage with a $${price} USD price point. Funnel ${funnelType} (${funnelNames[funnelType]}) is most appropriate to build the necessary foundation before scaling.`,
    emotionalArchetype: 'El Constructor',
    emotionalArchetypeReason: isEs
      ? `Basado en el propósito declarado ("${purpose.slice(0, 100)}..."), la marca opera desde un arquetipo Constructor: crea resultados tangibles y transforma la realidad de su audiencia.`
      : `Based on the declared purpose, the brand operates from a Builder archetype: creates tangible results and transforms audience reality.`,
    simulationNotes: buildSimulation(industry, country, stage, channels, price, isEs),
    documents: {
      perfil: isEs
        ? `# PERFIL PROFUNDO — ${brand.toUpperCase()}\n\n## Propósito\n${purpose}\n\n## Producto / Servicio\n${product}\n\n## Cliente Ideal (ICP)\n**Quién es:** ${interpretedIcp}\n\n**Su mayor dolor:** ${icpPain}\n\n**Lo que realmente desea:** ${interpretedDesire}\n\n## Visión\n${vision}\n\n## Arquetipo Emocional\nEl Constructor — Una marca que transforma la realidad de su audiencia a través de resultados concretos y demostrables.\n\n## Promesa de Valor\n${valuePromise}\n\n## Lista de Nunca\n${String(session.neverList ?? '')}\n\n---\n*Generado por el Motor Estratégico Avilion/Humind*`
        : `# DEEP PROFILE — ${brand.toUpperCase()}\n\n## Purpose\n${purpose}\n\n## Product / Service\n${product}\n\n## Ideal Client (ICP)\n**Who they are:** ${interpretedIcp}\n\n**Their biggest pain:** ${icpPain}\n\n**What they truly desire:** ${interpretedDesire}\n\n## Vision\n${vision}\n\n## Emotional Archetype\nThe Builder — A brand that transforms audience reality through concrete, demonstrable results.\n\n## Value Promise\n${valuePromise}\n\n---\n*Generated by Avilion/Humind Strategy Engine*`,
      funnel: isEs
        ? `# FUNNEL ${funnelType} — ${funnelNames[funnelType].toUpperCase()}\n\n## Por qué este funnel\n${brand} está en etapa ${stage} con precio de $${price} USD. Este funnel maximiza la conversión dado el contexto actual.\n\n## Estructura del Funnel\n\n### TOFU (Top of Funnel) — Atracción\n- Contenido educativo sobre ${industry}\n- Solución al dolor: "${icpPain}"\n- Canal primario recomendado: ${primaryChannel}\n\n### MOFU (Middle of Funnel) — Consideración\n- Caso de estudio o demostración\n- Lead magnet relacionado al deseo: "${interpretedDesire}"\n- Email sequence de 5 días\n\n### BOFU (Bottom of Funnel) — Conversión\n- Oferta directa: ${product}\n- Precio: $${price} USD\n- Garantía o prueba de confianza\n\n## Métricas Clave\n- CTR objetivo: >3%\n- Conversión landing: >8%\n- Tiempo promedio del funnel: 7-14 días\n\n---\n*Generado por el Motor Estratégico Avilion/Humind*`
        : `# FUNNEL ${funnelType} — ${funnelNames[funnelType].toUpperCase()}\n\n## Why this funnel\n${brand} is at ${stage} stage with $${price} USD price. This funnel maximizes conversion given the current context.\n\n## Funnel Structure\n\n### TOFU — Attraction\n- Educational content about ${industry}\n- Pain solution: "${icpPain}"\n- Primary channel: ${primaryChannel}\n\n### MOFU — Consideration\n- Case study or demonstration\n- Lead magnet related to: "${interpretedDesire}"\n- 5-day email sequence\n\n### BOFU — Conversion\n- Direct offer: ${product}\n- Price: $${price} USD\n- Trust guarantee\n\n---\n*Generated by Avilion/Humind Strategy Engine*`,
      contenido: isEs
        ? `# CONTENIDO MADRE — ${brand.toUpperCase()}\n\n## Pilar 1 — Educación\nContenido que enseña sobre ${industry} y resuelve el dolor de "${icpPain}".\nFormatos: carruseles, hilos, videos cortos explicativos.\n\n## Pilar 2 — Inspiración\nHistorias de transformación que conectan con el deseo de "${interpretedDesire}".\nFormatos: reels, testimonios, before/after.\n\n## Pilar 3 — Prueba Social\nResultados reales, casos de estudio, métricas de clientes.\nFormatos: stories, posts de resultados.\n\n## Pilar 4 — Conversión\nContenido directo sobre la oferta, precio y cómo empezar.\nFormatos: posts directos, CTAs, FAQs.\n\n## Voz de Marca\n- Tono: Directo, cálido, experto sin ser arrogante\n- Vocabulario: El del cliente (usar sus palabras)\n- Prohibido: Tecnicismos, promesas vacías, comparaciones con competidores\n\n## Calendario Editorial\n- Frecuencia recomendada: 4-5 posts por semana\n- Canal primario: ${primaryChannel}\n- Mejor horario: A definir con datos de la cuenta (generalmente 12pm y 7pm local)\n\n---\n*Generado por el Motor Estratégico Avilion/Humind*`
        : `# MOTHER CONTENT — ${brand.toUpperCase()}\n\n## Pillar 1 — Education\nContent teaching about ${industry} and solving "${icpPain}".\nFormats: carousels, threads, short explanatory videos.\n\n## Pillar 2 — Inspiration\nTransformation stories connecting to the desire for "${interpretedDesire}".\nFormats: reels, testimonials, before/after.\n\n## Pillar 3 — Social Proof\nReal results, case studies, client metrics.\nFormats: stories, result posts.\n\n## Pillar 4 — Conversion\nDirect content about offer, price and how to start.\nFormats: direct posts, CTAs, FAQs.\n\n## Brand Voice\n- Tone: Direct, warm, expert without being arrogant\n- Vocabulary: Client's own words\n- Never: Jargon, empty promises, competitor comparisons\n\n---\n*Generated by Avilion/Humind Strategy Engine*`,
      itr: isEs
        ? `# ITR — ÍNDICE DE TRANSFORMACIÓN REAL\n## ${brand.toUpperCase()}\n\n## Qué medimos\nEl ITR mide si nuestra estrategia está transformando realmente el negocio del cliente, no solo generando métricas vanidosas.\n\n## Indicadores por Capa\n\n### Capa 1 — Emocional (peso: 25%)\n- El cliente siente claridad sobre su dirección estratégica\n- Confianza en la propuesta de valor\n- Meta: Score ≥ 8/10 en check-in mensual\n\n### Capa 2 — Audiencia (peso: 25%)\n- Crecimiento de seguidores genuinos en canales activos\n- Tasa de engagement > promedio del nicho\n- Meta: +500 seguidores reales/mes (etapa inicial)\n\n### Capa 3 — Conversión (peso: 30%)\n- Leads generados por el funnel\n- Tasa de conversión lead → cliente\n- Meta: ≥ 3 leads calificados/semana\n\n### Capa 4 — Ingresos (peso: 20%)\n- Ingresos mensuales vs baseline ($${session.monthlyRevenue} USD actual)\n- Precio promedio por venta vs $${price} USD objetivo\n- Meta: +30% ingresos en 90 días\n\n## Check-in Mensual\nReunión de 30 minutos para revisar métricas, ajustar estrategia y calcular ITR del mes.\n\n## Caso de Éxito\nSe considera caso de éxito cuando:\n- ITR ≥ 80% durante 2 meses consecutivos\n- Al menos 1 cliente adquirido mediante el funnel\n- El cliente puede articular claramente su propuesta de valor\n\n---\n*Generado por el Motor Estratégico Avilion/Humind*`
        : `# ITR — REAL TRANSFORMATION INDEX\n## ${brand.toUpperCase()}\n\n## What we measure\nITR measures whether our strategy is truly transforming the client's business, not just generating vanity metrics.\n\n## Layer Indicators\n\n### Layer 1 — Emotional (weight: 25%)\n- Client feels clarity about strategic direction\n- Confidence in value proposition\n- Goal: Score ≥ 8/10 in monthly check-in\n\n### Layer 2 — Audience (weight: 25%)\n- Genuine follower growth on active channels\n- Engagement rate > niche average\n- Goal: +500 real followers/month (initial stage)\n\n### Layer 3 — Conversion (weight: 30%)\n- Leads generated by the funnel\n- Lead → client conversion rate\n- Goal: ≥ 3 qualified leads/week\n\n### Layer 4 — Revenue (weight: 20%)\n- Monthly revenue vs baseline ($${session.monthlyRevenue} USD current)\n- Goal: +30% revenue in 90 days\n\n## Monthly Check-in\n30-minute meeting to review metrics, adjust strategy and calculate monthly ITR.\n\n---\n*Generated by Avilion/Humind Strategy Engine*`,
      roadmap: buildRoadmap(stage, product, primaryChannel, price, isEs),
    },
  })
}

export async function generateStrategy(sessionId: string): Promise<{ blueprintId: string }> {
  const session = await db.onboardingSession.findUnique({ where: { id: sessionId } })
  if (!session) throw new Error('Session not found')

  // Ensure client record exists
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
    await db.onboardingSession.update({ where: { id: sessionId }, data: { clientId: newClient.id } })
    clientId = newClient.id
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  const useMock = !apiKey || apiKey === 'your-api-key-here'

  let strategyJson: string

  if (useMock) {
    strategyJson = buildMockStrategy(session as unknown as Record<string, unknown>)
  } else {
    const anthropic = new Anthropic({ apiKey })
    const msg = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserPrompt(session as unknown as Record<string, unknown>) }],
    })
    const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
    // Extract JSON from response (Claude might wrap it in markdown)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    strategyJson = jsonMatch ? jsonMatch[0] : text
  }

  // Verify it's valid JSON
  JSON.parse(strategyJson)

  // Delete any existing blueprint for this session (new analysis replaces old)
  await db.blueprint.deleteMany({ where: { sessionId } })

  const blueprint = await db.blueprint.create({
    data: {
      clientId,
      sessionId,
      contentMd: strategyJson,
      contentHtml: '', // generated on demand
    },
  })

  return { blueprintId: blueprint.id }
}
