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
    "perfil": "Complete PERFIL.md — min 500 words. Include: Propósito, Producto/Servicio, ICP detallado, Visión, Arquetipo Emocional, Promesa de Valor, Lista de Nunca.",
    "funnel": "Complete FUNNEL.md — min 500 words. Include: Por qué este funnel, TOFU/MOFU/BOFU with specific tactics, métricas clave, next immediate step.",
    "contenido": "Complete CONTENIDO_MADRE.md — min 500 words. Include: 4 content pillars with real post examples, brand voice, editorial calendar, formats per channel.",
    "itr": "Complete ITR.md — min 400 words. Include: 6 indicator layers with weights, specific numeric goals from client data, monthly check-in process.",
    "roadmap": "Complete PLAN_90_DIAS.md — min 600 words. Include: Phase 1 (days 1-30) Foundation, Phase 2 (days 31-60) Authority, Phase 3 (days 61-90) Scale. Each phase has weekly tasks in checklist format (- [ ] action), numeric goals, key decisions."
  }
}`

// ── User Prompt ───────────────────────────────────────────────────────────────

const lang = s.language === 'en' ? 'English' : 'Spanish'

const USER_PROMPT = `Analyze this client and generate their complete strategy.

CLIENT INTERVIEW DATA:
- Name: ${s.clientName}
- Brand: ${s.brandName || 'Not defined yet'}
- Country: ${s.country}
- Industry: ${s.industry}
- Language preference: ${s.language}
- Active channels: ${s.channels}

BUSINESS:
- Product/Service: ${s.productDescription}
- Price: $${s.productPrice} USD
- Business stage: ${s.businessStage}
- Monthly revenue: $${s.monthlyRevenue} USD

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
- Business type: ${s.businessType}
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

${s.agencyLearnings?.length ? `
AGENCY LEARNINGS (from similar past clients):
${s.agencyLearnings.map((l, i) => `${i + 1}. ${l}`).join('\n')}

Use these learnings to inform funnel type selection and archetype assignment.
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

// ── Push to Gitea ─────────────────────────────────────────────────────────────

const GITEA_URL = process.env.GITEA_URL
const GITEA_TOKEN = process.env.GITEA_TOKEN
const GITEA_OWNER = process.env.GITEA_REPO_OWNER || 'avilion'
const GITEA_REPO = process.env.GITEA_REPO_NAME || 'ecosistema-avilion-humind'

if (GITEA_URL && GITEA_TOKEN) {
  console.log('📡 Pushing to Gitea...')

  const giteaFiles = {
    [`clientes/${CLIENT_SLUG}/PERFIL.md`]: docs.perfil,
    [`clientes/${CLIENT_SLUG}/FUNNEL.md`]: docs.funnel,
    [`clientes/${CLIENT_SLUG}/CONTENIDO_MADRE.md`]: docs.contenido,
    [`clientes/${CLIENT_SLUG}/ITR.md`]: docs.itr,
    ...(docs.roadmap ? { [`clientes/${CLIENT_SLUG}/PLAN_90_DIAS.md`]: docs.roadmap } : {}),
    [`clientes/${CLIENT_SLUG}/CLAUDE.md`]: claudeMd,
  }

  for (const [filePath, content] of Object.entries(giteaFiles)) {
    if (!content) continue
    try {
      const encoded = Buffer.from(content).toString('base64')
      const createRes = await fetch(
        `${GITEA_URL}/api/v1/repos/${GITEA_OWNER}/${GITEA_REPO}/contents/${filePath}`,
        {
          method: 'POST',
          headers: { Authorization: `token ${GITEA_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: `strategy: ${CLIENT_SLUG} — auto-generated`, content: encoded }),
        }
      )
      if (!createRes.ok) {
        // File exists — update with SHA
        const getRes = await fetch(
          `${GITEA_URL}/api/v1/repos/${GITEA_OWNER}/${GITEA_REPO}/contents/${filePath}`,
          { headers: { Authorization: `token ${GITEA_TOKEN}` } }
        )
        if (getRes.ok) {
          const existing = await getRes.json()
          await fetch(
            `${GITEA_URL}/api/v1/repos/${GITEA_OWNER}/${GITEA_REPO}/contents/${filePath}`,
            {
              method: 'PUT',
              headers: { Authorization: `token ${GITEA_TOKEN}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                message: `strategy: update ${CLIENT_SLUG}`,
                content: encoded,
                sha: existing.sha,
              }),
            }
          )
        }
      }
      console.log(`  ✓ ${filePath}`)
    } catch (err) {
      console.warn(`  ⚠ Gitea push failed for ${filePath}:`, err.message)
    }
  }
  console.log('✅ Gitea push complete')
} else {
  console.log('ℹ  GITEA_URL/GITEA_TOKEN not set — skipping Gitea push')
}

console.log(`\n🚀 Strategy pipeline complete for ${CLIENT_SLUG}`)
