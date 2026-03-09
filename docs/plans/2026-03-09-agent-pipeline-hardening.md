# Agent Pipeline Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 10 blind spots in the agent activation pipeline — security holes, broken regeneration, double-triggers, and missing auto-wiring — without touching anything that already works.

**Architecture:** Shared `lib/claude.ts` utility replaces 3 copy-pasted `runClaude()` functions. Status tracking added to session. Auto-activations wired into `analyze` (auto market research) and `approve` (auto checklist seed). Gitea push removed from runner (moved exclusively to approve). Double-trigger removed from `onboarding/complete`.

**Tech Stack:** Next.js 16, Prisma 5 + PostgreSQL 17, TypeScript, Claude CLI subprocess (Windows)

**Verification method:** `cd /c/projects/avilion-portal && npx next build` — must compile clean (0 errors) after every task.

---

## Reference: The 10 Blind Spots

| ID | Issue | Task |
|----|-------|------|
| B1 | Double-trigger: onboarding/complete + analyze both push interview.json | Task 5 |
| B2 | Blueprint regeneration broken: DB cache never invalidated | Task 6 |
| B3 | 4 routes have no auth guard | Tasks 2–4 |
| B4 | runClaude() copy-pasted in 3 files with hardcoded path | Task 1 |
| B5 | No `generating` status on session | Task 6 |
| B6 | Market research not auto-run before strategy generation | Task 6 |
| B7 | No auto-checklist seed on approval | Task 7 |
| B8 | Learning duplication: approve route + /api/intelligence both insert | Task 7 + 8 |
| B9 | Runner pushes unapproved strategy docs to Gitea | Task 9 |
| B10 | contenido doc truncated at 3000 chars | Task 3 |

---

## Task 1: Create `lib/claude.ts` — shared subprocess utility

**Files:**
- Create: `lib/claude.ts`

This extracts the `runClaude()` function that is copy-pasted identically in 3 routes, making the `C:\Users\geren` path configurable.

**Step 1: Create the file**

```typescript
// lib/claude.ts
import { spawn } from 'child_process'
import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'

/**
 * Runs a prompt through the Claude CLI subprocess.
 * Uses the pre-authenticated claude installation on the host machine.
 * Deletes CLAUDECODE + CLAUDE_CODE_ENTRYPOINT to prevent nested-session errors.
 * Uses a unique temp directory per call so Claude starts a fresh conversation.
 */
export async function runClaudeSubprocess(
  prompt: string,
  timeoutMs: number = 120_000,
): Promise<string> {
  const spawnEnv = { ...process.env }
  delete spawnEnv['CLAUDECODE']
  delete spawnEnv['CLAUDE_CODE_ENTRYPOINT']

  // CLAUDE_HOME must point to the user profile where claude is authenticated.
  // On the self-hosted Windows machine this is C:\Users\geren.
  // Override via CLAUDE_HOME env var for portability.
  const claudeHome = process.env.CLAUDE_HOME ?? 'C:\\Users\\geren'
  spawnEnv['HOME'] = claudeHome
  spawnEnv['USERPROFILE'] = claudeHome
  spawnEnv['APPDATA'] = path.join(claudeHome, 'AppData', 'Roaming')
  spawnEnv['LOCALAPPDATA'] = path.join(claudeHome, 'AppData', 'Local')

  // Unique cwd per call — Claude tracks conversation history by cwd.
  // A fresh directory guarantees a new conversation, not a resumed one.
  const runDir = path.join(os.tmpdir(), `claude-run-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  fs.mkdirSync(runDir, { recursive: true })

  return new Promise((resolve, reject) => {
    const proc = spawn('claude', ['--print', '--dangerously-skip-permissions'], {
      env: spawnEnv,
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: runDir,
    })

    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', (d: Buffer) => { stdout += d.toString() })
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString() })

    const timer = setTimeout(() => {
      proc.kill('SIGTERM')
      reject(new Error(`Claude subprocess timed out after ${timeoutMs}ms. stdout: ${stdout.length} chars. stderr: ${stderr.slice(0, 300)}`))
    }, timeoutMs)

    proc.on('close', (code: number) => {
      clearTimeout(timer)
      try { fs.rmSync(runDir, { recursive: true, force: true }) } catch { /* ignore */ }
      if (code !== 0 && !stdout) {
        reject(new Error(`Claude exited ${code}: ${stderr.slice(0, 300)}`))
      } else {
        resolve(stdout)
      }
    })

    proc.on('error', (err: Error) => {
      clearTimeout(timer)
      reject(err)
    })

    proc.stdin.write(prompt, 'utf8', () => proc.stdin.end())
  })
}
```

**Step 2: Verify it compiles**

```bash
cd /c/projects/avilion-portal && npx tsc --noEmit 2>&1 | head -20
```

Expected: No errors referencing `lib/claude.ts`.

**Step 3: Commit**

```bash
cd /c/projects/avilion-portal
git add lib/claude.ts
git commit -m "feat: extract shared runClaudeSubprocess utility to lib/claude.ts"
```

---

## Task 2: Refactor `market-research` — add auth + use lib/claude.ts

**Files:**
- Modify: `app/api/sessions/[id]/market-research/route.ts`

**Step 1: Replace the file contents**

Replace the entire file. Key changes:
1. Add `import { getSession } from '@/lib/auth'` and guard at top of POST
2. Add `import { runClaudeSubprocess } from '@/lib/claude'`
3. Remove the local `runClaude()` function (lines 91–123)
4. Replace `runClaude(prompt)` call with `runClaudeSubprocess(prompt, 120_000)`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { runClaudeSubprocess } from '@/lib/claude'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const intel = await db.marketIntelligence.findUnique({ where: { sessionId: id } })
  return NextResponse.json(intel)
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const session = await db.onboardingSession.findUnique({ where: { id } })
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  const lang = session.language === 'en' ? 'English' : 'Spanish'

  const prompt = `CRITICAL EXECUTION MODE: Non-interactive pipeline. Output a single raw JSON object — nothing else. No markdown, no explanation, no code fences.

You are a market intelligence analyst. Analyze the market for this brand and return structured intelligence.

CLIENT:
- Industry: ${session.industry}
- Country: ${session.country}
- Product: ${session.productDescription}
- Price: $${session.productPrice} USD
- ICP Pain: ${session.icpPain}
- ICP Desire: ${session.icpDesire}
- Business stage: ${session.businessStage}

Respond in ${lang}. Output ONLY this JSON object:
{
  "competitors": [
    { "name": "Competitor name or category", "positioning": "How they position", "weakness": "Their main weakness" }
  ],
  "trends": [
    { "trend": "Trend name", "impact": "How this impacts this brand", "opportunity": "Specific opportunity" }
  ],
  "positioning": "2-3 paragraph positioning opportunity analysis — where this brand can uniquely win in this market",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5", "keyword6", "keyword7", "keyword8"],
  "rawSummary": "3-4 sentence executive summary of the market intelligence"
}

Be specific to ${session.industry} in ${session.country}. Use real market knowledge. Include 3-4 competitors/categories, 3-4 trends, 8 keywords.`

  const raw = await runClaudeSubprocess(prompt, 120_000)
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) {
    return NextResponse.json({ error: 'Could not parse AI response', raw: raw.slice(0, 500) }, { status: 500 })
  }

  let parsed: {
    competitors: unknown[]; trends: unknown[]
    positioning: string; keywords: string[]; rawSummary: string
  }
  try {
    parsed = JSON.parse(match[0])
  } catch {
    return NextResponse.json({ error: 'Invalid JSON from AI' }, { status: 500 })
  }

  const intel = await db.marketIntelligence.upsert({
    where: { sessionId: id },
    update: {
      competitors: JSON.stringify(parsed.competitors ?? []),
      trends: JSON.stringify(parsed.trends ?? []),
      positioning: parsed.positioning ?? '',
      keywords: JSON.stringify(parsed.keywords ?? []),
      rawSummary: parsed.rawSummary ?? '',
      generatedAt: new Date(),
    },
    create: {
      sessionId: id,
      industry: session.industry,
      country: session.country,
      competitors: JSON.stringify(parsed.competitors ?? []),
      trends: JSON.stringify(parsed.trends ?? []),
      positioning: parsed.positioning ?? '',
      keywords: JSON.stringify(parsed.keywords ?? []),
      rawSummary: parsed.rawSummary ?? '',
    },
  })

  return NextResponse.json(intel)
}
```

**Step 2: Verify build**

```bash
cd /c/projects/avilion-portal && npx next build 2>&1 | grep -E "error|Error|✓" | head -20
```

Expected: No errors on the market-research route.

**Step 3: Commit**

```bash
cd /c/projects/avilion-portal
git add app/api/sessions/[id]/market-research/route.ts
git commit -m "fix: add auth guard to market-research route, use shared runClaudeSubprocess"
```

---

## Task 3: Refactor `content/generate` — add auth + use lib/claude.ts + fix truncation

**Files:**
- Modify: `app/api/sessions/[id]/content/generate/route.ts`

**Step 1: Apply three changes to the file**

1. Add `import { getSession } from '@/lib/auth'` and guard in POST handler
2. Add `import { runClaudeSubprocess } from '@/lib/claude'`
3. Remove the local `runClaude()` function (lines 52–91)
4. Replace `runClaude(prompt)` call with `runClaudeSubprocess(prompt, 90_000)`
5. Fix truncation: change `.slice(0, 3000)` to `.slice(0, 8000)` (line ~117)

The top of the file after changes:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { runClaudeSubprocess } from '@/lib/claude'
```

The POST handler opening:

```typescript
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  // ... rest unchanged
```

The truncation fix (find and replace):

```typescript
// BEFORE:
contenidoDoc = strategy.documents?.contenido ?? blueprint.contentMd.slice(0, 4000)
// ...
contenidoDoc = blueprint.contentMd.slice(0, 4000)

// AFTER:
contenidoDoc = strategy.documents?.contenido ?? blueprint.contentMd.slice(0, 8000)
// ...
contenidoDoc = blueprint.contentMd.slice(0, 8000)
```

The `runClaude` call replacement:

```typescript
// BEFORE:
raw = await runClaude(prompt)

// AFTER:
raw = await runClaudeSubprocess(prompt, 90_000)
```

**Step 2: Verify build**

```bash
cd /c/projects/avilion-portal && npx next build 2>&1 | grep -E "error|Error|✓" | head -20
```

**Step 3: Commit**

```bash
cd /c/projects/avilion-portal
git add app/api/sessions/[id]/content/generate/route.ts
git commit -m "fix: add auth to content/generate, use shared Claude utility, fix 3000→8000 truncation"
```

---

## Task 4: Refactor `validate-content` and `health` — add auth + use lib/claude.ts

**Files:**
- Modify: `app/api/sessions/[id]/validate-content/route.ts`
- Modify: `app/api/sessions/[id]/health/route.ts`

**Step 1: Update `validate-content/route.ts`**

Same pattern as Tasks 2–3:
1. Add `import { getSession } from '@/lib/auth'`
2. Add `import { runClaudeSubprocess } from '@/lib/claude'`
3. Remove local `runClaude()` function (lines 91–123)
4. Replace `runClaude(prompt)` → `runClaudeSubprocess(prompt, 90_000)`
5. Add auth guard at top of POST:

```typescript
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // ... rest unchanged
```

**Step 2: Update `health/route.ts`**

Add a single auth guard at the top of GET:

```typescript
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // ... rest unchanged
```

**Step 3: Verify build**

```bash
cd /c/projects/avilion-portal && npx next build 2>&1 | grep -E "error|Error|✓" | head -20
```

**Step 4: Commit**

```bash
cd /c/projects/avilion-portal
git add app/api/sessions/[id]/validate-content/route.ts app/api/sessions/[id]/health/route.ts
git commit -m "fix(security): add auth guards to validate-content and health routes"
```

---

## Task 5: Fix `onboarding/complete` — remove GitHub push (B1 double-trigger)

**Files:**
- Modify: `app/api/onboarding/[token]/complete/route.ts`

**Step 1: Remove the GitHub push block**

The file currently has a large `if (githubConfigured())` block starting at line 20 that builds `interviewData` and calls `githubPushFile`. Delete that entire block — lines 20–61.

Also remove the now-unused imports:

```typescript
// REMOVE these two imports:
import { githubPushFile, githubConfigured } from '@/lib/github'
```

After the edit, the file should be ~18 lines:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const session = await db.onboardingSession.findUnique({ where: { token } })
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (session.expiresAt < new Date()) return NextResponse.json({ error: 'Expired' }, { status: 410 })
  if (session.status === 'client_done') return NextResponse.json({ ok: true }) // idempotent

  // Mark session complete — strategy generation is triggered separately by the team
  await db.onboardingSession.update({
    where: { token },
    data: { status: 'client_done', completedAt: new Date() },
  })

  return NextResponse.json({ ok: true })
}
```

**Step 2: Verify build**

```bash
cd /c/projects/avilion-portal && npx next build 2>&1 | grep -E "error|Error|✓" | head -20
```

**Step 3: Commit**

```bash
cd /c/projects/avilion-portal
git add app/api/onboarding/[token]/complete/route.ts
git commit -m "fix: remove GitHub auto-push from onboarding/complete — eliminates double-trigger"
```

---

## Task 6: Fix `analyze` route — blueprint reset + generating status + auto market research (B2, B5, B6)

**Files:**
- Modify: `app/api/sessions/[id]/analyze/route.ts`

This is the most important task. Three changes in one route:

1. **B2** — Delete existing DB blueprint before pushing (clears cache for regeneration)
2. **B5** — Set `status = 'generating'` before pushing, so the dashboard and queue show correct state
3. **B6** — Auto-run market research if missing, so the strategy is always enriched

**Step 1: Replace the entire file**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { githubPushFile, githubConfigured } from '@/lib/github'
import { generateStrategy } from '@/lib/strategy'
import { runClaudeSubprocess } from '@/lib/claude'

// Fetch or auto-generate market intelligence for this session.
// This runs synchronously inside analyze so the strategy prompt is enriched.
async function ensureMarketIntelligence(
  sessionId: string,
  session: { industry: string; country: string; productDescription: string; productPrice: number; icpPain: string; icpDesire: string; businessStage: string; language: string },
): Promise<Record<string, unknown> | null> {
  // Return cached result if it exists
  const existing = await db.marketIntelligence.findUnique({ where: { sessionId } })
  if (existing) {
    return {
      positioning: existing.positioning,
      rawSummary: existing.rawSummary,
      competitors: (() => { try { return JSON.parse(existing.competitors) } catch { return [] } })(),
      trends: (() => { try { return JSON.parse(existing.trends) } catch { return [] } })(),
      keywords: (() => { try { return JSON.parse(existing.keywords) } catch { return [] } })(),
    }
  }

  // Auto-generate market intelligence now
  console.log(`[analyze] Auto-running market research for session ${sessionId}`)
  const lang = session.language === 'en' ? 'English' : 'Spanish'
  const prompt = `CRITICAL EXECUTION MODE: Non-interactive pipeline. Output a single raw JSON object — nothing else. No markdown, no explanation, no code fences.

You are a market intelligence analyst. Analyze the market for this brand and return structured intelligence.

CLIENT:
- Industry: ${session.industry}
- Country: ${session.country}
- Product: ${session.productDescription}
- Price: $${session.productPrice} USD
- ICP Pain: ${session.icpPain}
- ICP Desire: ${session.icpDesire}
- Business stage: ${session.businessStage}

Respond in ${lang}. Output ONLY this JSON object:
{
  "competitors": [{"name":"...","positioning":"...","weakness":"..."}],
  "trends": [{"trend":"...","impact":"...","opportunity":"..."}],
  "positioning": "2-3 paragraph positioning opportunity",
  "keywords": ["kw1","kw2","kw3","kw4","kw5","kw6","kw7","kw8"],
  "rawSummary": "3-4 sentence executive summary"
}

Be specific to ${session.industry} in ${session.country}. Include 3-4 competitors, 3-4 trends, 8 keywords.`

  try {
    const raw = await runClaudeSubprocess(prompt, 120_000)
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return null

    const parsed = JSON.parse(match[0])
    const intel = await db.marketIntelligence.create({
      data: {
        sessionId,
        industry: session.industry,
        country: session.country,
        competitors: JSON.stringify(parsed.competitors ?? []),
        trends: JSON.stringify(parsed.trends ?? []),
        positioning: parsed.positioning ?? '',
        keywords: JSON.stringify(parsed.keywords ?? []),
        rawSummary: parsed.rawSummary ?? '',
      },
    })
    return {
      positioning: intel.positioning,
      rawSummary: intel.rawSummary,
      competitors: parsed.competitors ?? [],
      trends: parsed.trends ?? [],
      keywords: parsed.keywords ?? [],
    }
  } catch (err) {
    console.warn('[analyze] Auto market research failed (non-fatal):', err)
    return null
  }
}

async function enrichWithIntelligence(sessionId: string, industry: string, session: Parameters<typeof ensureMarketIntelligence>[1]): Promise<{
  marketIntelligence: Record<string, unknown> | null
  agencyLearnings: string[]
}> {
  const [marketIntelligence, learnings] = await Promise.all([
    ensureMarketIntelligence(sessionId, session),
    db.agencyLearning.findMany({
      where: { industry },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ])

  return {
    marketIntelligence,
    agencyLearnings: learnings.map(l => l.insight),
  }
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const teamSession = await getSession()
  if (!teamSession) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  if (githubConfigured()) {
    const session = await db.onboardingSession.findUnique({ where: { id } })
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    // B2: Delete existing blueprint so the blueprint route re-polls GitHub
    // after regeneration instead of returning the stale DB version.
    await db.blueprint.deleteMany({ where: { sessionId: id } })

    // B5: Mark session as generating so the team queue and dashboard show correct state
    await db.onboardingSession.update({ where: { id }, data: { status: 'generating' } })

    const slug = (session.brandName || session.clientName)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    const interviewData = {
      sessionId: session.id,
      clientSlug: slug,
      clientName: session.clientName,
      brandName: session.brandName,
      email: session.email,
      language: session.language,
      country: session.country,
      industry: session.industry,
      channels: session.channels,
      productDescription: session.productDescription,
      productPrice: session.productPrice,
      businessStage: session.businessStage,
      monthlyRevenue: session.monthlyRevenue,
      purpose: session.purpose,
      values: session.values,
      neverList: session.neverList,
      vision3Years: session.vision3Years,
      icpDemographic: session.icpDemographic,
      icpPain: session.icpPain,
      icpDesire: session.icpDesire,
      businessType: session.businessType,
      revenueModel: session.revenueModel,
      specificProduct: session.specificProduct,
      targetAudience: session.targetAudience,
      agencyContext: session.agencyContext,
    }

    try {
      // B6: Auto-run market research if not already done, then enrich interview data
      const { marketIntelligence, agencyLearnings } = await enrichWithIntelligence(
        id,
        session.industry,
        session,
      )

      const enrichedData = {
        ...interviewData,
        ...(marketIntelligence ? { marketIntelligence } : {}),
        ...(agencyLearnings.length ? { agencyLearnings } : {}),
      }

      await githubPushFile(
        `clientes/${slug}/interview.json`,
        JSON.stringify(enrichedData, null, 2),
        `analyze: trigger strategy generation for ${session.clientName}`,
      )
      return NextResponse.json({ generating: true, slug })
    } catch (err) {
      // If push failed, reset status so team can retry
      await db.onboardingSession.update({ where: { id }, data: { status: 'client_done' } })
      console.error('GitHub push failed, falling back to local generation:', err)
    }
  }

  // Fallback: local generation
  try {
    const result = await generateStrategy(id)
    return NextResponse.json(result)
  } catch (err) {
    console.error('Strategy generation failed:', err)
    return NextResponse.json({ error: 'Strategy generation failed' }, { status: 500 })
  }
}
```

**Step 2: Verify build**

```bash
cd /c/projects/avilion-portal && npx next build 2>&1 | grep -E "error|Error|✓" | head -20
```

**Step 3: Commit**

```bash
cd /c/projects/avilion-portal
git add app/api/sessions/[id]/analyze/route.ts
git commit -m "fix: analyze route — clear old blueprint, set generating status, auto-run market research"
```

---

## Task 7: Fix `blueprint` route — clear `generating` status on save (B5)

**Files:**
- Modify: `app/api/sessions/[id]/blueprint/route.ts`

**Step 1: Add status reset after blueprint is saved**

Find the block that creates the blueprint (around line 47):

```typescript
const blueprint = await db.blueprint.create({
  data: {
    clientId,
    sessionId: id,
    contentMd: blueprintJson,
    contentHtml: '',
  },
})
```

Add a status reset immediately after:

```typescript
const blueprint = await db.blueprint.create({
  data: {
    clientId,
    sessionId: id,
    contentMd: blueprintJson,
    contentHtml: '',
  },
})

// Clear generating status — runner has finished
await db.onboardingSession.update({
  where: { id },
  data: { status: 'client_done' },
})
```

**Step 2: Verify build**

```bash
cd /c/projects/avilion-portal && npx next build 2>&1 | grep -E "error|Error|✓" | head -20
```

**Step 3: Commit**

```bash
cd /c/projects/avilion-portal
git add app/api/sessions/[id]/blueprint/route.ts
git commit -m "fix: clear generating status when blueprint is saved from runner"
```

---

## Task 8: Fix `approve` route — remove inline learnings + auto-seed checklist (B7, B8)

**Files:**
- Modify: `app/api/sessions/[id]/approve/route.ts`

**Step 1: Remove the inline learning extraction block**

Find and delete the entire block at lines 131–151:

```typescript
// Extract agency learnings from this approved session (non-blocking)
const insights = [
  `Industry ${session.industry} in ${session.country} matched Funnel ${strategy.funnelType}`,
  // ...
].filter(Boolean) as string[]

db.$transaction(
  insights.map(insight =>
    db.agencyLearning.create({ data: { ... } })
  )
).catch(...)
```

Replace it with a call to the `/api/intelligence` endpoint so learnings always go through the single canonical path:

```typescript
// Extract learnings via the intelligence endpoint (non-blocking, deduped)
fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3001'}/api/intelligence`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sessionId: id }),
}).catch(err => console.error('[approve] Learning extraction failed:', err))
```

**Step 2: Add auto-checklist seed after the blueprint update**

Find the block that marks the session complete (around line 94–98). After that block, add:

```typescript
// Auto-seed checklist with standard operational items if none exist yet
const existingChecklist = await db.checklistItem.count({ where: { sessionId: id } })
if (existingChecklist === 0) {
  const defaultItems = [
    'Logo y variantes entregados al cliente',
    'Accesos a redes sociales configurados',
    'Credenciales del portal enviadas al cliente',
    'Guía de marca compartida con el equipo',
    'Banco de fotografías recibido',
    'Revisión de copy del primer mes aprobada',
    'Calendario editorial del primer mes listo',
  ]
  await db.checklistItem.createMany({
    data: defaultItems.map((label, i) => ({
      sessionId: id,
      label,
      completed: false,
      order: i + 1,
    })),
  })
}
```

**Step 3: Verify build**

```bash
cd /c/projects/avilion-portal && npx next build 2>&1 | grep -E "error|Error|✓" | head -20
```

**Step 4: Commit**

```bash
cd /c/projects/avilion-portal
git add app/api/sessions/[id]/approve/route.ts
git commit -m "fix: remove duplicate learning extraction from approve, auto-seed checklist on approval"
```

---

## Task 9: Fix `generate-strategy.mjs` — remove Gitea push (B9)

**Files:**
- Modify: `scripts/generate-strategy.mjs`

**Step 1: Delete the Gitea push block**

Find the block starting at line 407:

```javascript
// ── Push to Gitea ─────────────────────────────────────────────────────────────
const GITEA_URL = process.env.GITEA_URL
// ... all the way through ...
console.log('✅ Gitea push complete')
} else {
  console.log('ℹ  GITEA_URL/GITEA_TOKEN not set — skipping Gitea push')
}
```

Delete the entire block (approximately lines 407–467).

Also delete the variables that are now unused at the top of that block:

```javascript
const GITEA_URL = process.env.GITEA_URL
const GITEA_TOKEN = process.env.GITEA_TOKEN
const GITEA_OWNER = process.env.GITEA_REPO_OWNER || 'avilion'
const GITEA_REPO = process.env.GITEA_REPO_NAME || 'ecosistema-avilion-humind'
```

The last line of the file should now be:

```javascript
console.log(`\n🚀 Strategy pipeline complete for ${CLIENT_SLUG}`)
```

**Why:** The runner still writes `blueprint.json` to the GitHub repo (which the portal polls). Gitea only receives the final *approved* strategy via `approve/route.ts` — which is already correct and untouched.

**Step 2: Verify the script still runs (syntax check)**

```bash
node --check /c/projects/avilion-portal/scripts/generate-strategy.mjs && echo "✓ syntax OK"
```

Expected: `✓ syntax OK`

**Step 3: Commit**

```bash
cd /c/projects/avilion-portal
git add scripts/generate-strategy.mjs
git commit -m "fix: remove Gitea push from runner — Gitea receives approved-only docs via approve route"
```

---

## Task 10: Schema — add unique constraint to AgencyLearning (B8)

**Files:**
- Modify: `prisma/schema.prisma`
- Create: migration via `npx prisma migrate dev`

**Step 1: Add `@@unique` to the AgencyLearning model**

Find the `AgencyLearning` model in `prisma/schema.prisma`. It currently ends with:

```prisma
model AgencyLearning {
  id        String   @id @default(cuid())
  industry  String
  funnelType Int
  archetype String
  insight   String
  sourceId  String?
  createdAt DateTime @default(now())
}
```

Add the unique constraint:

```prisma
model AgencyLearning {
  id        String   @id @default(cuid())
  industry  String
  funnelType Int
  archetype String
  insight   String
  sourceId  String?
  createdAt DateTime @default(now())

  @@unique([sourceId, insight])
}
```

**Step 2: Update `/api/intelligence` to use upsert instead of create**

In `app/api/intelligence/route.ts`, find the `db.$transaction(insights.map(...))` block and replace each `db.agencyLearning.create` with `db.agencyLearning.upsert`:

```typescript
const created = await db.$transaction(
  insights.map(insight =>
    db.agencyLearning.upsert({
      where: {
        // Uses the new unique constraint
        sourceId_insight: { sourceId: sessionId, insight },
      },
      update: {}, // already exists — no-op
      create: {
        industry: session.industry,
        funnelType,
        archetype,
        insight,
        sourceId: sessionId,
      },
    })
  )
)
```

**Step 3: Run migration**

```bash
cd /c/projects/avilion-portal && npx prisma migrate dev --name add_agency_learning_unique_constraint
```

Expected output: `✓ Generated Prisma Client` and migration file created.

**Step 4: Verify build**

```bash
cd /c/projects/avilion-portal && npx next build 2>&1 | grep -E "error|Error|✓" | head -20
```

**Step 5: Commit**

```bash
cd /c/projects/avilion-portal
git add prisma/schema.prisma prisma/migrations/ app/api/intelligence/route.ts
git commit -m "fix: add unique constraint on AgencyLearning(sourceId, insight), upsert to prevent duplication"
```

---

## Task 11: Final verification — full build + push

**Step 1: Full clean build**

```bash
cd /c/projects/avilion-portal && npx next build 2>&1 | tail -30
```

Expected: All routes listed, 0 errors, 0 TypeScript warnings.

**Step 2: Verify `lib/claude.ts` is used by all 3 routes (no orphan copies)**

```bash
grep -r "runClaude\b" /c/projects/avilion-portal/app/api --include="*.ts"
```

Expected: **No output** — no route should have a local `runClaude` function anymore.

```bash
grep -r "runClaudeSubprocess" /c/projects/avilion-portal/app/api --include="*.ts"
```

Expected: 3 lines — market-research, content/generate, validate-content.

**Step 3: Verify auth guards on all 4 routes**

```bash
grep -l "getSession" /c/projects/avilion-portal/app/api/sessions/*/route.ts /c/projects/avilion-portal/app/api/sessions/*/*/route.ts 2>/dev/null
```

Expected output includes: `market-research/route.ts`, `content/generate/route.ts`, `validate-content/route.ts`, `health/route.ts`.

**Step 4: Verify Gitea push removed from runner**

```bash
grep -n "GITEA" /c/projects/avilion-portal/scripts/generate-strategy.mjs
```

Expected: **No output** — no Gitea references in the runner.

**Step 5: Verify onboarding/complete no longer references GitHub**

```bash
grep -n "github\|GitHub" /c/projects/avilion-portal/app/api/onboarding/[token]/complete/route.ts
```

Expected: **No output**.

**Step 6: Push to both remotes**

```bash
cd /c/projects/avilion-portal && git push gitea main && git push origin main
```

---

## Summary of Changes

| Blind Spot | Fixed In | Type |
|-----------|----------|------|
| B1 double-trigger | Task 5 | Remove GitHub push from complete route |
| B2 broken regeneration | Task 6 | Delete DB blueprint before re-push |
| B3 unauth routes (×4) | Tasks 2–4 | Add getSession() guard |
| B4 copy-pasted runClaude | Tasks 1–4 | Extract to lib/claude.ts |
| B5 no generating status | Tasks 6–7 | Set/clear on analyze/blueprint routes |
| B6 no auto market research | Task 6 | ensureMarketIntelligence() in analyze |
| B7 no auto checklist | Task 8 | Auto-seed 7 items on approval |
| B8 learning duplication | Tasks 8+10 | Remove inline extraction, add @@unique |
| B9 runner pushes unapproved to Gitea | Task 9 | Remove Gitea block from runner |
| B10 contenido truncation | Task 3 | 3000 → 8000 chars |

**Nothing that already works is changed.** The strategy prompt, GitHub Action workflow, Gitea push in approve route, client portal, all tab components, and dashboard UI are untouched.
