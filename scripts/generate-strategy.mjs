#!/usr/bin/env node
/**
 * Avilion/Humind Autonomous Strategy Generator
 *
 * Runs inside the GitHub Actions / Gitea Actions self-hosted runner.
 * Uses claude CLI (Max subscription, pre-authenticated on the host machine).
 * No API key required.
 *
 * Usage: CLIENT_SLUG=brand-name node scripts/generate-strategy.mjs
 */

import { spawn } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'

// ── Config ───────────────────────────────────────────────────────────────────

const CLIENT_SLUG = process.env.CLIENT_SLUG
if (!CLIENT_SLUG) {
  console.error('❌ CLIENT_SLUG env var required')
  process.exit(1)
}

const INTERVIEW_FILE = path.join('clientes', CLIENT_SLUG, 'interview.json')
if (!fs.existsSync(INTERVIEW_FILE)) {
  console.error(`❌ Interview file not found: ${INTERVIEW_FILE}`)
  process.exit(1)
}

const s = JSON.parse(fs.readFileSync(INTERVIEW_FILE, 'utf8'))
console.log(`🧠 Generating strategy for: ${s.clientName || CLIENT_SLUG}`)

// ── System Prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `CRITICAL EXECUTION MODE: You are running in a non-interactive pipeline. You MUST NOT use any file tools, write_file, create_file, bash, or any other tools. Do NOT create or modify any files. Your entire response must be a single raw JSON object written directly to stdout — nothing else.

You are the Avilion/Humind strategy engine — an expert marketing strategist trained in the 37-ring Marketing 5.0 ecosystem. Your job is to analyze a client's onboarding interview and generate their complete personalized marketing strategy.

## ABSOLUTE RULES — NEVER VIOLATE

1. NEVER invent client results, case studies, testimonials, or revenue numbers that are not explicitly provided in the interview data.
2. NEVER position the brand as something it is not. If the product is a physical item worth $20, the strategy must be about selling that item — not about being a consulting agency or service provider.
3. NEVER write about "our clients achieved X" or "join our program" language unless the brand is explicitly a service/coaching/consulting business.
4. If icpPain or icpDesire sound like the founder's own business problems (e.g., "getting leads", "more money"), flag this in simulationNotes and reinterpret it as the end-customer's pain based on what the product/service actually solves.
5. The brand type (physical product / service / digital product / personal brand) must be respected throughout ALL documents. A cannabis retailer at $20/unit sells directly to consumers — not B2B services to other cannabis businesses.
6. If businessStage = 'starting' and monthlyRevenue = 0: the strategy MUST assume zero existing social proof. All documents must avoid case studies, client results, and testimonials.

You have deep expertise in:
- Emotional marketing and audience psychology
- Funnel architecture and conversion optimization
- Brand soul and purpose-driven positioning
- Content strategy and multi-channel distribution
- Latin American and international markets

## THE 4 FUNNEL TYPES

Select the most appropriate funnel based on businessStage, product price, and audience:

**Funnel 1 — Awareness & Trust (Conciencia y Confianza)**
- Use when: businessStage = starting, OR price < $50, OR vague ICP answers
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

Respond ONLY with a valid JSON object. No markdown fences, no explanation, just raw JSON:

{
  "lang": "es or en matching the client's language",
  "funnelType": 1,
  "funnelReason": "2-3 sentence explanation of why this funnel was chosen",
  "emotionalArchetype": "El Constructor",
  "emotionalArchetypeReason": "Why this archetype fits this brand",
  "simulationNotes": "3-4 paragraph market analysis: industry context in their country, competitive landscape, opportunity size, key risks, specific recommendations",
  "documents": {
    "perfil": "Complete PERFIL.md — min 500 words. Include: Propósito, Producto/Servicio EXACTO (one sentence a 10-year-old would understand), ICP detallado con demografía + dolor real + deseo real, Visión, Arquetipo Emocional, Promesa de Valor, Lista de Nunca. If businessType is personal_brand, also include the client's Personal Story Arc, signature topics derived from their contentPillars, and their authority positioning based on credentialHighlights.",
    "funnel": "Complete FUNNEL.md — min 500 words. Include: Por qué este funnel, TOFU/MOFU/BOFU with specific tactics, métricas clave, next immediate step. IMPORTANT: If businessStage is 'starting', TOFU must be 100% of initial tactics — no sales language, no urgency tactics, no 'limited spots'. Build awareness and trust first.",
    "contenido": "CONTENIDO_MADRE.md — CRITICAL DOCUMENT. Min 600 words. This document will be used to generate 30 content pieces per month. Structure it as follows:\n\n1. QUÉ VENDEMOS (1 sentence): State EXACTLY what the brand sells. A product, a service, a digital good, or a personal brand. No ambiguity.\n\n2. QUIÉN COMPRA (1 sentence): State exactly who the buyer is and what they pay for.\n\n3. CUATRO PILARES DE CONTENIDO — choose based on businessType:\n  - physical_product: Educación del producto | Estilo de vida | Historias de clientes | Historia de marca\n  - service: Conciencia del problema | Proceso y expertise | Transformación (SOLO si tienes casos reales) | Detrás de escenas\n  - digital_product: Problema + dolor | Vista previa del producto | Resultados (SOLO si verificados) | Autoridad del creador\n  - personal_brand: Liderazgo de pensamiento | Historia personal | Consejos prácticos | Detrás de escenas\n  For each pillar: name, angle, 2 specific topic examples WITH the exact hook line.\n\n4. VOZ DE MARCA (3-5 adjetivos + 1 oración describiendo el tono)\n\n5. VOCABULARIO DE CTA — list 4-5 specific CTAs that match this business model:\n  - physical_product: 'Compra ahora / Pide el tuyo / Link en bio / Visita la tienda / Ordena hoy'\n  - service: 'Reserva tu consulta / DM para cotizar / Agenda una llamada gratuita / Aplica aquí'\n  - digital_product: 'Acceso inmediato / Compra aquí / Descárgalo ahora / Consíguelo en el link'\n  - personal_brand: 'Sígueme / Guarda esto / DM para colaborar / Únete a la comunidad'\n\n6. REGLAS DE PRUEBA SOCIAL — based on businessStage:\n  - starting (0-3 meses, sin clientes fijos): PROHIBIDO usar casos de clientes, números de resultados, 'nuestros clientes lograron'. Usar solo características del producto/servicio, el problema que resuelve, y la transformación que promete.\n  - selling (tiene clientes, quiere escalar): PUEDE usar 1-2 testimoniales reales si los tiene. No inventar números.\n  - scaling (tiene base probada): PUEDE usar resultados agregados si son reales.",
    "itr": "Complete ITR.md — min 400 words. Include: 6 indicator layers with weights, specific numeric goals from client data, monthly check-in process.",
    "roadmap": "Complete PLAN_90_DIAS.md — min 600 words. Include: Phase 1 (days 1-30) Foundation, Phase 2 (days 31-60) Authority, Phase 3 (days 61-90) Scale. Each phase has weekly tasks in checklist format (- [ ] action), numeric goals, key decisions. If businessStage is 'starting', Phase 1 must focus on product clarity, ICP validation, and building first 3 real testimonials — NOT on running ads or scaling."
  }
}

## PERSONAL BRAND SPECIAL INSTRUCTIONS
When businessType === 'personal_brand':
- The strategy must center on thought leadership and authority building, NOT product marketing
- Content strategy should prioritize the client's personal narrative arc and expertise journey
- The funnel should be built around the personal story → authority → trust → engagement loop
- PERFIL.md must include: the client's Personal Story Arc (origin → struggle → transformation → mission), their Signature Topics (from contentPillars), and their Authority Stack (from credentialHighlights)
- CONTENIDO_MADRE.md should define their Signature Voice and map each content pillar to an authority angle
- Funnel 3 (Premium & Relationship) is the default for personal brands unless revenue signals suggest otherwise
- All recommendations should treat the person as the brand — messaging, visuals, and tone must feel personal and authentic`

// ── User Prompt ───────────────────────────────────────────────────────────────

const lang = s.language === 'en' ? 'English' : 'Spanish'

const businessSection = s.businessType === 'personal_brand' ? `
## PERSONAL BRAND
- Area of expertise: ${s.expertise || 'Not specified'}
- Personal story: ${s.personalStory || 'Not specified'}
- Credential highlights: ${s.credentialHighlights || 'Not specified'}
- Content pillars: ${s.contentPillars || 'Not specified'}
- Target audience: ${s.targetAudience || 'Not specified'}
` : s.businessType === 'service' ? `
## SERVICE BUSINESS
- Service offered: ${s.productDescription || 'Not specified'}
- Pricing model: ${s.revenueModel || 'Not specified'}
- Typical price: $${s.productPrice || 0} USD
- Business stage: ${s.businessStage || 'Not specified'}
` : s.businessType === 'digital_product' ? `
## DIGITAL PRODUCT
- Product type: ${s.specificProduct || 'Not specified'}
- Product description: ${s.productDescription || 'Not specified'}
- Price: $${s.productPrice || 0} USD
- Status: ${s.businessStage || 'Not specified'}
- Monthly revenue: $${s.monthlyRevenue || 0} USD
` : `
## PHYSICAL PRODUCT / OTHER
- Product/service: ${s.productDescription || 'Not specified'}
- Price: $${s.productPrice || 0} USD
- Business stage: ${s.businessStage || 'Not specified'}
- Monthly revenue: $${s.monthlyRevenue || 0} USD
`

const USER_PROMPT = `Analyze this client and generate their complete strategy.

CLIENT INTERVIEW DATA:
- Name: ${s.clientName}
- Brand: ${s.brandName || 'Not defined yet'}
- Country: ${s.country}
- Industry: ${s.industry}
- Language preference: ${s.language}
- Active channels: ${s.channels}
- Business type: ${s.businessType || 'Not specified'}

${businessSection}

BRAND SOUL:
- Purpose: ${s.purpose}
- Values: ${s.values}
- Never list: ${s.neverList}

AUDIENCE:
- Who they are: ${s.icpDemographic}
- Their biggest pain: ${s.icpPain}
- What they desire: ${s.icpDesire}

VISION:
- 3-year vision: ${s.vision3Years}

AGENCY CONTEXT (internal):
- Revenue model: ${s.revenueModel}
- Specific product: ${s.specificProduct}
- Target audience (agency view): ${s.targetAudience}
- Agency objective: ${s.agencyContext}

${s.marketIntelligence ? `
MARKET INTELLIGENCE (pre-analyzed by the ecosystem):
${s.marketIntelligence.rawSummary}

Positioning opportunity:
${s.marketIntelligence.positioning}

Competitors analyzed:
${JSON.stringify(s.marketIntelligence.competitors, null, 2)}

Market trends:
${JSON.stringify(s.marketIntelligence.trends, null, 2)}

Key keywords: ${Array.isArray(s.marketIntelligence.keywords) ? s.marketIntelligence.keywords.join(', ') : ''}

USE THIS MARKET INTELLIGENCE to make the strategy more specific and grounded in real market reality.
The simulationNotes should reference these competitors and trends specifically.
` : ''}

${s.nicheIntelligence ? `
NICHE INTELLIGENCE (deep audience + competitive analysis):

ICP EXACT VOCABULARY (use these phrases verbatim in PERFIL.md and CONTENIDO_MADRE.md):
${Array.isArray(s.nicheIntelligence.icpVocabulary) ? s.nicheIntelligence.icpVocabulary.map((v, i) => `${i + 1}. "${v}"`).join('\n') : ''}

ICP TRIGGER WORDS (include in hooks and CTAs):
${Array.isArray(s.nicheIntelligence.icpTriggerWords) ? s.nicheIntelligence.icpTriggerWords.join(', ') : ''}

ICP OBJECTIONS + REBUTTALS (address these in FUNNEL.md and CONTENIDO_MADRE.md):
${Array.isArray(s.nicheIntelligence.icpObjections) ? s.nicheIntelligence.icpObjections.map(o => `- "${o.objection}" → ${o.rebuttal}`).join('\n') : ''}

COMPETITIVE DIFFERENTIATION (use in PERFIL.md positioning and CONTENIDO_MADRE.md hooks):
${Array.isArray(s.nicheIntelligence.competitorDiffs) ? s.nicheIntelligence.competitorDiffs.map(d => `- vs ${d.competitor}: ${d.ourDiff}`).join('\n') : ''}

UNIQUE POSITIONING ANGLE TO OWN:
${s.nicheIntelligence.positioningAngle || 'Not analyzed'}

TOP-PERFORMING CONTENT FORMATS IN THIS NICHE:
${Array.isArray(s.nicheIntelligence.dominantFormats) ? s.nicheIntelligence.dominantFormats.map(f => `- ${f.platform}: ${f.topFormat} (${f.avgEngagement} engagement) — ${f.why}`).join('\n') : ''}

PROVEN HOOK TEMPLATES (use as starting points in CONTENIDO_MADRE.md examples):
${Array.isArray(s.nicheIntelligence.hookTemplates) ? s.nicheIntelligence.hookTemplates.map((h, i) => `${i + 1}. [${h.stage?.toUpperCase()}] "${h.structure}" → Example: "${h.example}"`).join('\n') : ''}

CRITICAL INSTRUCTIONS FOR USING NICHE INTELLIGENCE:
- PERFIL.md: ICP section must use the exact vocabulary listed above, NOT generic marketing language
- CONTENIDO_MADRE.md: Each content pillar must include 2 real post examples using these hook templates
- FUNNEL.md: Address the 3 objections listed above with the provided rebuttals in the MOFU section
- simulationNotes: Must reference the positioning angle and at least 2 competitive differentiation points
- All hook examples in CONTENIDO_MADRE.md must use ICP trigger words
` : ''}

${s.agencyLearnings?.length ? `
AGENCY LEARNINGS (from similar past clients):
${s.agencyLearnings.map((l, i) => `${i + 1}. ${l}`).join('\n')}

Use these learnings to inform funnel type selection and archetype assignment.
` : ''}

${s.platformIntelligence?.length ? `
PLATFORM INTELLIGENCE (approved by team — use to inform CONTENIDO_MADRE.md format recommendations and FUNNEL.md channel tactics):

${s.platformIntelligence.map(pi => `${pi.platform.toUpperCase()}:
  Algorithm rewards: ${Array.isArray(pi.algorithmPriorities) ? pi.algorithmPriorities.slice(0, 3).join(' | ') : ''}
  Best formats: ${Array.isArray(pi.bestFormats) ? pi.bestFormats.slice(0, 2).map(f => f.format).join(', ') : ''}
  Frequency: ${pi.bestFrequency || ''}
  Trending now: ${Array.isArray(pi.currentTrends) ? pi.currentTrends.slice(0, 2).map(t => t.angle || t.trend).join(' | ') : ''}
  Avoid: ${Array.isArray(pi.avoidList) ? pi.avoidList.slice(0, 2).map(a => a.what).join(', ') : ''}${pi.teamNotes ? `\n  Team note: ${pi.teamNotes}` : ''}`).join('\n\n')}

CRITICAL INSTRUCTIONS FOR USING PLATFORM INTELLIGENCE:
- CONTENIDO_MADRE.md: In the channelFormats section, recommend the formats listed above as best-performing. Do NOT recommend formats that appear in the avoidList.
- FUNNEL.md: In TOFU/MOFU/BOFU sections, reference the trending content types when suggesting tactics for each platform.
- roadmap (PLAN_90_DIAS.md): In Phase 1, recommend starting with the highest-performing formats for each platform listed above.
- The posting frequency recommendations above should inform the weekly content plan in roadmap.
` : ''}

Generate the complete strategy. All documents must be in ${lang}.
The simulation notes should include specific market insights for ${s.industry} in ${s.country}.
Be specific, actionable, and grounded in their actual answers.

IMPORTANT:
- If the ICP answer is weak or vague, generate an intelligent suggestion and mark it as "(perfil sugerido por el ecosistema)"
- All 5 documents (perfil, funnel, contenido, itr, roadmap) are REQUIRED
- roadmap must use markdown checkbox format (- [ ] action) for all weekly tasks
- Use the client's actual words from their interview wherever possible
- Respond with ONLY the JSON object, nothing else`

// ── Run Claude subprocess ─────────────────────────────────────────────────────

const tmpDir = path.join(os.tmpdir(), 'avilion-strategy')
fs.mkdirSync(tmpDir, { recursive: true })

const promptFile = path.join(tmpDir, `${CLIENT_SLUG}-prompt.txt`)
const fullPrompt = `${SYSTEM_PROMPT}\n\n---\n\n${USER_PROMPT}`
fs.writeFileSync(promptFile, fullPrompt, 'utf8')

console.log('🤖 Spawning claude subprocess...')
console.log('📝 Prompt file:', promptFile, `(${fullPrompt.length} chars)`)

// Strip env vars that make claude refuse to run inside another claude session
const spawnEnv = { ...process.env }
delete spawnEnv.CLAUDECODE
delete spawnEnv.CLAUDE_CODE_ENTRYPOINT

// Run claude from a unique temp directory so it starts a brand-new conversation
// every time. Claude tracks history by cwd — if we reuse the same cwd it will
// "resume" a previous killed session and skip the JSON wrapper entirely.
const claudeRunDir = path.join(os.tmpdir(), `claude-run-${Date.now()}`)
fs.mkdirSync(claudeRunDir, { recursive: true })
console.log('📂 Claude run dir:', claudeRunDir)

// Use spawn + explicit stdin.end() so claude always receives a clean EOF.
const rawOutput = await new Promise((resolve, reject) => {
  const proc = spawn('claude --print --dangerously-skip-permissions', [], {
    env: spawnEnv,
    shell: true,   // needed on Windows to resolve claude.cmd
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: claudeRunDir,  // fresh dir = no conversation history to resume
  })

  // Write the full prompt then close stdin — this sends a guaranteed EOF
  proc.stdin.write(fullPrompt, 'utf8', () => proc.stdin.end())

  let stdout = ''
  let stderr = ''
  proc.stdout.on('data', chunk => { stdout += chunk.toString('utf8') })
  proc.stderr.on('data', chunk => { stderr += chunk.toString('utf8') })

  const TIMEOUT_MS = 1_200_000  // 20 min
  const timer = setTimeout(() => {
    proc.kill('SIGTERM')
    reject(new Error(`TIMEOUT after 20min. stdout: ${stdout.length} chars. stderr: ${stderr.slice(0, 300)}`))
  }, TIMEOUT_MS)

  proc.on('close', (code, signal) => {
    clearTimeout(timer)
    if (code !== 0 || signal) {
      reject(new Error(`claude exited code=${code} signal=${signal}\nstdout (${stdout.length} chars): ${stdout.slice(0, 1000)}\nstderr: ${stderr.slice(0, 500)}`))
    } else {
      resolve(stdout)
    }
  })

  proc.on('error', err => { clearTimeout(timer); reject(err) })
}).catch(err => {
  console.error('❌ claude subprocess failed:', err.message)
  process.exit(1)
})

// Extract JSON (claude may include some preamble or markdown fences)
const jsonMatch = rawOutput.match(/\{[\s\S]*\}/)
if (!jsonMatch) {
  console.error('❌ No JSON found in claude output')
  console.error('Output was:', rawOutput.slice(0, 1000))
  process.exit(1)
}

// Repair common JSON issues: literal newlines/tabs inside string values
// Models often output markdown docs with real \n instead of escaped \\n
function repairJson(str) {
  let fixed = ''
  let inString = false
  let escaped = false
  for (let i = 0; i < str.length; i++) {
    const ch = str[i]
    if (escaped) { fixed += ch; escaped = false; continue }
    if (ch === '\\') { escaped = true; fixed += ch; continue }
    if (ch === '"') { inString = !inString; fixed += ch; continue }
    if (inString && ch === '\n') { fixed += '\\n'; continue }
    if (inString && ch === '\r') { fixed += '\\r'; continue }
    if (inString && ch === '\t') { fixed += '\\t'; continue }
    fixed += ch
  }
  return fixed
}

let strategy
try {
  strategy = JSON.parse(jsonMatch[0])
} catch (firstErr) {
  console.warn('⚠ Initial JSON.parse failed, attempting repair:', firstErr.message)
  try {
    strategy = JSON.parse(repairJson(jsonMatch[0]))
    console.log('✅ JSON repaired successfully')
  } catch (err) {
    console.error('❌ Failed to parse JSON even after repair:', err.message)
    console.error('Output preview (first 2000 chars):', rawOutput.slice(0, 2000))
    process.exit(1)
  }
}

console.log(`✅ Strategy generated — Funnel ${strategy.funnelType}, Archetype: ${strategy.emotionalArchetype}`)

// ── Write output files ────────────────────────────────────────────────────────

const outDir = path.join('clientes', CLIENT_SLUG)
fs.mkdirSync(outDir, { recursive: true })

const docs = strategy.documents || {}

if (docs.perfil)    fs.writeFileSync(path.join(outDir, 'PERFIL.md'), docs.perfil)
if (docs.funnel)    fs.writeFileSync(path.join(outDir, 'FUNNEL.md'), docs.funnel)
if (docs.contenido) fs.writeFileSync(path.join(outDir, 'CONTENIDO_MADRE.md'), docs.contenido)
if (docs.itr)       fs.writeFileSync(path.join(outDir, 'ITR.md'), docs.itr)
if (docs.roadmap)   fs.writeFileSync(path.join(outDir, 'PLAN_90_DIAS.md'), docs.roadmap)

// CLAUDE.md — turns Claude Code into the client's dedicated AI agent
const name = s.brandName || s.clientName
const isEs = (s.language || 'es') !== 'en'
const claudeMd = isEs
  ? `# CLAUDE.md — ${name}

## Tu rol
Eres el agente estratégico dedicado de ${name} dentro del ecosistema Avilion/Humind.
Cuando leas este archivo, asumes el contexto completo de este cliente y operas como su estratega de marketing personal.

## Cliente
- **Marca:** ${name}
- **Industria:** ${s.industry}
- **País:** ${s.country}
- **Etapa:** ${s.businessStage}
- **Funnel activo:** Funnel ${strategy.funnelType} — ${strategy.funnelReason}
- **Arquetipo emocional:** ${strategy.emotionalArchetype}

## Propósito de la marca
${s.purpose}

## Instrucciones permanentes
1. Siempre habla desde el arquetipo ${strategy.emotionalArchetype}
2. Toda decisión de contenido pasa primero por el propósito de la marca
3. El cliente ideal tiene este dolor: "${s.icpPain}"
4. El cliente ideal desea: "${s.icpDesire}"
5. Nunca hagas: ${s.neverList}
6. Canales activos: ${s.channels}
7. Precio del producto: $${s.productPrice} USD

## Simulación de mercado
${strategy.simulationNotes}

## Archivos de referencia
- PERFIL.md → Identidad y audiencia profunda
- FUNNEL.md → Arquitectura de conversión activa
- CONTENIDO_MADRE.md → Pilares y voz de marca
- ITR.md → Métricas y criterios de éxito
- PLAN_90_DIAS.md → Hoja de ruta trimestral

## Cómo operar
Cuando el equipo de Avilion trabaje en este cliente, usa este contexto para:
- Generar ideas de contenido alineadas al arquetipo ${strategy.emotionalArchetype}
- Revisar si las decisiones respetan la lista de nunca
- Sugerir mejoras al funnel basadas en métricas ITR
- Mantener coherencia narrativa en todos los canales
- Crear contenido madre que conecte dolor → deseo → transformación
`
  : `# CLAUDE.md — ${name}

## Your role
You are the dedicated strategy agent for ${name} within the Avilion/Humind ecosystem.
When you read this file, you assume the complete context of this client and operate as their personal marketing strategist.

## Client
- **Brand:** ${name}
- **Industry:** ${s.industry}
- **Country:** ${s.country}
- **Stage:** ${s.businessStage}
- **Active funnel:** Funnel ${strategy.funnelType} — ${strategy.funnelReason}
- **Emotional archetype:** ${strategy.emotionalArchetype}

## Brand purpose
${s.purpose}

## Permanent instructions
1. Always speak from the ${strategy.emotionalArchetype} archetype
2. Every content decision passes through the brand purpose first
3. The ideal client has this pain: "${s.icpPain}"
4. The ideal client desires: "${s.icpDesire}"
5. Never do: ${s.neverList}
6. Active channels: ${s.channels}
7. Product price: $${s.productPrice} USD

## Market simulation
${strategy.simulationNotes}

## Reference files
- PERFIL.md → Identity and deep audience
- FUNNEL.md → Active conversion architecture
- CONTENIDO_MADRE.md → Pillars and brand voice
- ITR.md → Metrics and success criteria
- PLAN_90_DIAS.md → 90-day roadmap

## How to operate
Use this context to:
- Generate content ideas aligned to the ${strategy.emotionalArchetype} archetype
- Review decisions against the never list
- Suggest funnel improvements based on ITR metrics
- Maintain narrative coherence across all channels
`

fs.writeFileSync(path.join(outDir, 'CLAUDE.md'), claudeMd)

// blueprint.json — portal reads this to detect completion
fs.writeFileSync(path.join(outDir, 'blueprint.json'), JSON.stringify({
  ...strategy,
  generatedAt: new Date().toISOString(),
  sessionId: s.sessionId,
  clientSlug: CLIENT_SLUG,
}, null, 2))

console.log(`📁 Files written to ${outDir}/`)

console.log(`\n🚀 Strategy pipeline complete for ${CLIENT_SLUG}`)
