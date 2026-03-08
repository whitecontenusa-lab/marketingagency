# Onboarding Portal — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a bilingual (ES/EN) onboarding web portal that captures client DNA through a 2-phase interview, auto-creates Gitea folders with pre-filled templates, and generates a PDF summary.

**Architecture:** Next.js 15 App Router with two route groups — `(public)` for the client-facing interview and `(team)` for the internal dashboard. All data persists in SQLite via Prisma. A Gitea API client creates client folders on completion.

**Tech Stack:** Next.js 15, TypeScript, Prisma, SQLite, Tailwind CSS 4, @anthropic-ai/sdk (already installed), @react-pdf/renderer

---

## Prerequisites (run once before starting)

```bash
cd /c/projects/avilion-portal
npm install @react-pdf/renderer bcryptjs
npm install --save-dev @types/bcryptjs
```

Also: generate a Gitea API token:
1. Go to http://localhost:3000/user/settings/applications
2. Click "Generate Token" → name it "avilion-portal"
3. Copy the token — you'll need it for the `.env` file in Task 1

---

## Task 1: Environment + Prisma Schema Update

**Files:**
- Create: `.env`
- Modify: `prisma/schema.prisma`

**Step 1: Create `.env` file**

```bash
# /c/projects/avilion-portal/.env
DATABASE_URL="file:./prisma/dev.db"
GITEA_URL="http://localhost:3000"
GITEA_TOKEN="<paste-your-gitea-token-here>"
GITEA_REPO_OWNER="avilion"
GITEA_REPO_NAME="ecosistema-avilion-humind"
TEAM_SESSION_SECRET="avilion-secret-2026-change-this"
```

**Step 2: Update `prisma/schema.prisma`** — add missing fields to existing models

Replace the `Client` model with:
```prisma
model Client {
  id             String    @id @default(cuid())
  name           String
  brandName      String?
  email          String?
  whatsapp       String?
  channels       String?   // JSON: [{channel, handle}]
  industry       String
  country        String
  language       String    @default("es")
  phase          Int       @default(1)
  status         String    @default("active")
  onboardingDate DateTime  @default(now())
  archivedAt     DateTime?
  createdAt      DateTime  @default(now())

  profile            ClientProfile?
  emotionalCheckins  EmotionalCheckin[]
  itrScores          ItrScore[]
  funnelMetrics      FunnelMetric[]
  contentMetrics     ContentMetric[]
  ringActivations    RingActivation[]
  alerts             Alert[]
  onboardingSessions OnboardingSession[]
  blueprints         Blueprint[]
}
```

Replace the `ClientProfile` model with:
```prisma
model ClientProfile {
  id                    String   @id @default(cuid())
  clientId              String   @unique

  // Soul
  purpose               String   @default("")
  values                String   @default("")   // JSON: [{name, description}]
  neverList             String   @default("")   // JSON: [string]
  vision3Years          String   @default("")

  // ICP — Basic (from client)
  icpDemographic        String   @default("")
  icpPain               String   @default("")
  icpDesire             String   @default("")
  icpObjection          String   @default("")

  // ICP — Deep (from team)
  icpMicrosegment       String   @default("")
  icpInternalDialogue   String   @default("")
  icpDeepPain           String   @default("")
  icpDeepDesire         String   @default("")
  icpCounterargument    String   @default("")

  // Archetypes
  emotionalArchetype    String   @default("")
  emotionalArchetypeDesc String  @default("")
  audienceArchetype     String   @default("")
  audienceArchetypeDesc String   @default("")
  archetypeRelationship String   @default("")

  // Content
  contentEmotion        String   @default("")
  contentTransformation String   @default("")
  contentPillars        String   @default("")  // JSON: [{name, pct, topics[]}]
  voiceAdjectives       String   @default("")  // JSON: [string]
  voiceVocabulary       String   @default("")
  voiceForbidden        String   @default("")
  toneByContext         String   @default("")  // JSON: {educational, story, inspiration, conversion}
  channelFormats        String   @default("")  // JSON: [{channel, format, frequency, duration}]

  // Funnel
  funnelType            Int      @default(0)
  funnelReason          String   @default("")
  pricingEntry          String   @default("")  // JSON: {name, price, objective}
  pricingCore           String   @default("")
  pricingPremium        String   @default("")
  valuePromise          String   @default("")

  // Philosophical Gate
  gateCanDeliver        Boolean  @default(false)
  gateGenuinePurpose    Boolean  @default(false)
  gateAutoServesPurpose Boolean  @default(false)
  gateMeasurableResults Boolean  @default(false)
  gateResult            String   @default("")  // APROBADO / REQUIERE_AJUSTE / NO_PROCEDER
  gateDiagnosisNotes    String   @default("")
  initialEmotionalState Int      @default(3)

  // Gitea
  giteaFolderCreated    Boolean  @default(false)
  giteaFolderPath       String   @default("")

  client                Client   @relation(fields: [clientId], references: [id])
}
```

Replace the `OnboardingSession` model with:
```prisma
model OnboardingSession {
  id                   String    @id @default(cuid())
  clientId             String?
  clientName           String    @default("")
  brandName            String    @default("")
  email                String    @default("")
  whatsapp             String    @default("")
  language             String    @default("es")
  channels             String    @default("")   // JSON
  industry             String    @default("")
  country              String    @default("")
  productDescription   String    @default("")
  productPrice         Float     @default(0)
  businessStage        String    @default("")
  monthlyRevenue       Float     @default(0)
  purpose              String    @default("")
  values               String    @default("")   // JSON
  neverList            String    @default("")   // JSON
  vision3Years         String    @default("")
  icpDemographic       String    @default("")
  icpPain              String    @default("")
  icpDesire            String    @default("")
  agencyContext        String    @default("")
  businessType         String    @default("")
  revenueModel         String    @default("")
  specificProduct      String    @default("")
  targetAudience       String    @default("")
  token                String    @unique @default(cuid())
  expiresAt            DateTime
  status               String    @default("pending")
  agencyReviewApproved Boolean   @default(false)
  completedAt          DateTime?
  ipAddress            String?
  createdAt            DateTime  @default(now())
  client               Client?   @relation(fields: [clientId], references: [id])
  questions            InterviewQuestion[]
  blueprints           Blueprint[]
}
```

**Step 3: Run migration**

```bash
cd /c/projects/avilion-portal
npx prisma migrate dev --name "extend-onboarding-schema"
```

Expected output: `✓ Generated Prisma Client`

**Step 4: Verify migration**

```bash
npx prisma studio
```

Open http://localhost:5555 — you should see all models with the new fields.

**Step 5: Commit**

```bash
cd /c/projects/avilion-portal
git init  # only if not already a git repo
git add .env.example prisma/schema.prisma prisma/migrations/
git commit -m "feat: extend prisma schema for full onboarding data"
```

Note: add `.env` to `.gitignore`, create `.env.example` without real values.

---

## Task 2: Core Utilities

**Files:**
- Create: `lib/i18n.ts`
- Create: `lib/gitea.ts`
- Create: `lib/auth.ts`
- Create: `lib/db.ts`

**Step 1: Create `lib/db.ts`** — Prisma singleton

```typescript
// lib/db.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const db = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
```

**Step 2: Create `lib/i18n.ts`** — all UI strings in ES + EN

```typescript
// lib/i18n.ts
export type Lang = 'es' | 'en'

export const t = {
  es: {
    // Screen 0
    chooseLanguage: 'Elige tu idioma',
    // Screen 1
    welcome: 'Bienvenido',
    welcomeSubtitle: 'Esto toma ~15 minutos y nos ayuda a conocerte de verdad.',
    begin: 'Comenzar →',
    // Screen 2
    step2Title: 'Lo básico',
    fullName: 'Nombre completo',
    brandName: 'Nombre de tu marca o proyecto',
    industry: 'Industria o nicho',
    country: 'País',
    activeChannels: 'Canales activos',
    socialHandle: 'Tu usuario en',
    email: 'Email de contacto',
    whatsapp: 'WhatsApp (con código de país)',
    // Screen 3
    step3Title: 'Tu negocio',
    productDescription: '¿Qué vendes? Descríbelo en tus palabras',
    productPrice: 'Precio aproximado de tu producto/servicio principal (USD)',
    businessStage: '¿En qué etapa está tu negocio?',
    stageStarting: 'Empezando — aún no vendo o acabo de empezar',
    stageSelling: 'Ya vendiendo — tengo clientes y resultados',
    stageScaling: 'Escalando — quiero crecer a otro nivel',
    monthlyRevenue: 'Ingresos mensuales aproximados actuales (USD)',
    // Screen 4
    step4Title: 'El alma de tu proyecto',
    purpose: '¿Por qué existe este proyecto en el mundo? ¿A qué viene?',
    purposeHint: 'Escríbelo en tus palabras, sin filtros. No hay respuesta incorrecta.',
    values: 'Tus valores más importantes (hasta 4)',
    valueName: 'Valor',
    valueDescription: '¿Cómo se ve este valor en práctica?',
    addValue: '+ Agregar valor',
    neverList: 'Cosas que NUNCA harías, dirías o promocionarías (hasta 3)',
    addNever: '+ Agregar línea',
    // Screen 5
    step5Title: 'Tu audiencia',
    icpDemographic: '¿Quién es tu cliente ideal? (edad, situación de vida, dónde vive)',
    icpPain: '¿Cuál es el problema más grande que tiene tu cliente ideal?',
    icpDesire: '¿Qué es lo que realmente quiere lograr?',
    // Screen 6
    step6Title: 'Tu visión',
    vision: '¿Cómo se ve el éxito en 3 años si todo sale bien?',
    visionHint: '¿Qué está pasando en tu vida y en tu negocio? ¿Qué impacto tienes?',
    // Screen 7
    thankYouTitle: '¡Listo, [nombre]!',
    thankYouSubtitle: 'El equipo de Avilion revisará todo y te contactamos en las próximas 24 horas.',
    // Navigation
    next: 'Siguiente →',
    back: '← Anterior',
    saving: 'Guardando...',
    // Channels
    channels: {
      instagram: 'Instagram',
      tiktok: 'TikTok',
      youtube: 'YouTube',
      email: 'Email / Newsletter',
      linkedin: 'LinkedIn',
      facebook: 'Facebook',
      twitter: 'X (Twitter)',
      other: 'Otro',
    },
    // Team dashboard
    dashboard: 'Panel de Control',
    clients: 'Clientes',
    newClient: 'Nuevo Cliente',
    status: {
      pending: 'Pendiente',
      client_done: 'En Revisión',
      team_done: 'Completo',
      complete: 'Finalizado',
    },
    tabs: {
      profile: 'Perfil Profundo',
      content: 'Contenido',
      funnel: 'Funnel',
      gate: 'Gate Filosófico',
      finalize: 'Finalizar',
    },
    finalize: 'Finalizar Onboarding',
    finalizeConfirm: '¿Estás seguro? Esto creará la carpeta en Gitea y generará el PDF.',
    giteaSuccess: 'Carpeta creada en Gitea ✓',
    pdfSuccess: 'PDF generado ✓',
  },
  en: {
    // Screen 0
    chooseLanguage: 'Choose your language',
    // Screen 1
    welcome: 'Welcome',
    welcomeSubtitle: 'This takes ~15 minutes and helps us truly understand you.',
    begin: 'Get Started →',
    // Screen 2
    step2Title: 'The basics',
    fullName: 'Full name',
    brandName: 'Brand or project name',
    industry: 'Industry or niche',
    country: 'Country',
    activeChannels: 'Active channels',
    socialHandle: 'Your handle on',
    email: 'Contact email',
    whatsapp: 'WhatsApp (with country code)',
    // Screen 3
    step3Title: 'Your business',
    productDescription: 'What do you sell? Describe it in your own words',
    productPrice: 'Approximate price of your main product/service (USD)',
    businessStage: 'What stage is your business at?',
    stageStarting: 'Starting — not yet selling or just started',
    stageSelling: 'Already selling — I have clients and results',
    stageScaling: 'Scaling — I want to grow to the next level',
    monthlyRevenue: 'Approximate current monthly revenue (USD)',
    // Screen 4
    step4Title: 'The soul of your project',
    purpose: 'Why does this project exist in the world? What is it here for?',
    purposeHint: 'Write it in your own words, unfiltered. There\'s no wrong answer.',
    values: 'Your most important values (up to 4)',
    valueName: 'Value',
    valueDescription: 'How does this value show up in practice?',
    addValue: '+ Add value',
    neverList: 'Things you would NEVER do, say or promote (up to 3)',
    addNever: '+ Add line',
    // Screen 5
    step5Title: 'Your audience',
    icpDemographic: 'Who is your ideal client? (age, life situation, where they live)',
    icpPain: 'What is the biggest problem your ideal client has?',
    icpDesire: 'What do they really want to achieve?',
    // Screen 6
    step6Title: 'Your vision',
    vision: 'What does success look like in 3 years if everything goes well?',
    visionHint: 'What\'s happening in your life and business? What impact do you have?',
    // Screen 7
    thankYouTitle: 'Done, [name]!',
    thankYouSubtitle: 'The Avilion team will review everything and reach out within 24 hours.',
    // Navigation
    next: 'Next →',
    back: '← Back',
    saving: 'Saving...',
    // Channels
    channels: {
      instagram: 'Instagram',
      tiktok: 'TikTok',
      youtube: 'YouTube',
      email: 'Email / Newsletter',
      linkedin: 'LinkedIn',
      facebook: 'Facebook',
      twitter: 'X (Twitter)',
      other: 'Other',
    },
    // Team dashboard
    dashboard: 'Dashboard',
    clients: 'Clients',
    newClient: 'New Client',
    status: {
      pending: 'Pending',
      client_done: 'In Review',
      team_done: 'Team Done',
      complete: 'Complete',
    },
    tabs: {
      profile: 'Deep Profile',
      content: 'Content',
      funnel: 'Funnel',
      gate: 'Philosophical Gate',
      finalize: 'Finalize',
    },
    finalize: 'Finalize Onboarding',
    finalizeConfirm: 'Are you sure? This will create the Gitea folder and generate the PDF.',
    giteaSuccess: 'Gitea folder created ✓',
    pdfSuccess: 'PDF generated ✓',
  },
} satisfies Record<Lang, Record<string, unknown>>

export function getText(lang: Lang, key: string): string {
  const keys = key.split('.')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let val: any = t[lang]
  for (const k of keys) val = val?.[k]
  return typeof val === 'string' ? val : key
}
```

**Step 3: Create `lib/auth.ts`** — session helpers

```typescript
// lib/auth.ts
import { db } from './db'
import { cookies } from 'next/headers'

export async function getSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session-token')?.value
  if (!token) return null

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  })

  if (!session || session.expiresAt < new Date()) return null
  return session
}

export async function requireSession() {
  const session = await getSession()
  if (!session) {
    const { redirect } = await import('next/navigation')
    redirect('/login')
  }
  return session
}
```

**Step 4: Create `lib/gitea.ts`** — Gitea API client

```typescript
// lib/gitea.ts
const GITEA_URL = process.env.GITEA_URL!
const GITEA_TOKEN = process.env.GITEA_TOKEN!
const OWNER = process.env.GITEA_REPO_OWNER!
const REPO = process.env.GITEA_REPO_NAME!

async function giteaRequest(path: string, method: string, body?: unknown) {
  const res = await fetch(`${GITEA_URL}/api/v1${path}`, {
    method,
    headers: {
      'Authorization': `token ${GITEA_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Gitea API error ${res.status}: ${text}`)
  }
  return res.json()
}

export async function createFile(filePath: string, content: string, message: string) {
  const encoded = Buffer.from(content).toString('base64')
  return giteaRequest(`/repos/${OWNER}/${REPO}/contents/${filePath}`, 'POST', {
    message,
    content: encoded,
  })
}

export async function folderExists(folderPath: string): Promise<boolean> {
  try {
    await giteaRequest(`/repos/${OWNER}/${REPO}/contents/${folderPath}`, 'GET')
    return true
  } catch {
    return false
  }
}
```

**Step 5: Commit**

```bash
cd /c/projects/avilion-portal
git add lib/
git commit -m "feat: add core utilities — db, i18n, auth, gitea client"
```

---

## Task 3: Team Authentication

**Files:**
- Create: `app/(team)/login/page.tsx`
- Create: `app/api/auth/login/route.ts`
- Create: `app/api/auth/logout/route.ts`
- Create: `middleware.ts`
- Create: `scripts/seed.ts`

**Step 1: Create seed script** to create the first team user

```typescript
// scripts/seed.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

async function main() {
  const hash = await bcrypt.hash('avilion2026!', 12)
  await db.user.upsert({
    where: { email: 'team@avilion.co' },
    update: {},
    create: {
      email: 'team@avilion.co',
      name: 'Avilion Team',
      passwordHash: hash,
    },
  })
  console.log('✓ Seed complete — team@avilion.co / avilion2026!')
}

main().finally(() => db.$disconnect())
```

Add to `package.json` scripts:
```json
"seed": "tsx scripts/seed.ts"
```

Run: `npm install --save-dev tsx && npm run seed`

**Step 2: Create login API route**

```typescript
// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  const user = await db.user.findUnique({ where: { email } })
  if (!user) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })

  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  await db.session.create({ data: { userId: user.id, token, expiresAt } })

  const res = NextResponse.json({ ok: true })
  res.cookies.set('session-token', token, {
    httpOnly: true,
    expires: expiresAt,
    path: '/',
  })
  return res
}
```

**Step 3: Create logout API route**

```typescript
// app/api/auth/logout/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'

export async function POST() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session-token')?.value
  if (token) await db.session.deleteMany({ where: { token } })

  const res = NextResponse.json({ ok: true })
  res.cookies.delete('session-token')
  return res
}
```

**Step 4: Create middleware** to protect team routes

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const isTeamRoute = req.nextUrl.pathname.startsWith('/dashboard')
  const token = req.cookies.get('session-token')?.value

  if (isTeamRoute && !token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
```

**Step 5: Create login page**

```typescript
// app/(team)/login/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (res.ok) {
      router.push('/dashboard')
    } else {
      setError('Credenciales incorrectas')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-zinc-100 p-8">
        <h1 className="text-2xl font-bold text-zinc-900 mb-1">Avilion</h1>
        <p className="text-zinc-500 text-sm mb-8">Panel del equipo</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-zinc-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-zinc-700 transition disabled:opacity-50"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

**Step 6: Test login flow**

```bash
npm run dev
```
Open http://localhost:3000/dashboard → should redirect to /login
Login with team@avilion.co / avilion2026! → should redirect to /dashboard (404 is fine, page doesn't exist yet)

**Step 7: Commit**

```bash
git add app/ middleware.ts scripts/ package.json
git commit -m "feat: add team authentication — login, logout, session middleware"
```

---

## Task 4: Dashboard — Client List

**Files:**
- Create: `app/(team)/dashboard/page.tsx`
- Create: `app/api/clients/route.ts`

**Step 1: Create clients API route** (GET = list, POST = create)

```typescript
// app/api/clients/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const clients = await db.client.findMany({
    include: { onboardingSessions: { orderBy: { createdAt: 'desc' }, take: 1 } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(clients)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const client = await db.client.create({
    data: {
      name: body.name,
      brandName: body.brandName,
      email: body.email,
      industry: body.industry || 'General',
      country: body.country || 'Colombia',
      language: body.language || 'es',
    },
  })
  return NextResponse.json(client)
}
```

**Step 2: Create dashboard page**

```typescript
// app/(team)/dashboard/page.tsx
import { requireSession } from '@/lib/auth'
import { db } from '@/lib/db'
import Link from 'next/link'

const STATUS_LABELS: Record<string, string> = {
  pending: 'Esperando cliente',
  client_done: 'En revisión',
  team_done: 'Equipo listo',
  complete: 'Finalizado',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  client_done: 'bg-blue-50 text-blue-700',
  team_done: 'bg-purple-50 text-purple-700',
  complete: 'bg-green-50 text-green-700',
}

export default async function DashboardPage() {
  await requireSession()

  const sessions = await db.onboardingSession.findMany({
    orderBy: { createdAt: 'desc' },
    include: { client: true },
  })

  return (
    <div className="min-h-screen bg-zinc-50">
      <nav className="bg-white border-b border-zinc-100 px-6 py-4 flex items-center justify-between">
        <h1 className="font-bold text-zinc-900">Avilion — Panel</h1>
        <div className="flex items-center gap-4">
          <Link href="/dashboard/nuevo" className="bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 transition">
            + Nuevo Cliente
          </Link>
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="text-sm text-zinc-500 hover:text-zinc-900">Salir</button>
          </form>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <h2 className="text-xl font-semibold text-zinc-900 mb-6">Clientes ({sessions.length})</h2>

        {sessions.length === 0 ? (
          <div className="text-center py-20 text-zinc-400">
            <p className="text-lg">No hay clientes aún</p>
            <Link href="/dashboard/nuevo" className="mt-4 inline-block text-sm text-zinc-600 underline">Crear el primer cliente</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map(session => (
              <Link key={session.id} href={`/dashboard/cliente/${session.id}`}
                className="block bg-white rounded-xl border border-zinc-100 px-6 py-4 hover:border-zinc-300 transition">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-zinc-900">{session.clientName || 'Sin nombre'}</p>
                    <p className="text-sm text-zinc-500">{session.brandName} · {session.industry} · {session.country}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-xs font-medium px-3 py-1 rounded-full ${STATUS_COLORS[session.status] ?? 'bg-zinc-100 text-zinc-600'}`}>
                      {STATUS_LABELS[session.status] ?? session.status}
                    </span>
                    <span className="text-xs text-zinc-400">{new Date(session.createdAt).toLocaleDateString('es')}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
```

**Step 3: Test**

Run `npm run dev` and go to http://localhost:3000/dashboard
Expected: empty state with "No hay clientes aún" and "+ Nuevo Cliente" button

**Step 4: Commit**

```bash
git add app/
git commit -m "feat: add dashboard client list page"
```

---

## Task 5: Create New Client + Generate Onboarding Link

**Files:**
- Create: `app/(team)/dashboard/nuevo/page.tsx`
- Create: `app/api/onboarding/create/route.ts`

**Step 1: Create the API route** that generates a new session + link

```typescript
// app/api/onboarding/create/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const body = await req.json()

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  const session = await db.onboardingSession.create({
    data: {
      clientName: body.clientName,
      brandName: body.brandName || '',
      email: body.email || '',
      industry: body.industry || '',
      country: body.country || '',
      language: body.language || 'es',
      expiresAt,
      status: 'pending',
    },
  })

  const link = `http://localhost:3000/onboarding/${session.token}`
  return NextResponse.json({ session, link })
}
```

**Step 2: Create the "nuevo cliente" page**

```typescript
// app/(team)/dashboard/nuevo/page.tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function NuevoClientePage() {
  const [form, setForm] = useState({ clientName: '', brandName: '', email: '', industry: '', country: 'Colombia', language: 'es' })
  const [link, setLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/onboarding/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setLink(data.link)
    setLoading(false)
  }

  function copyLink() {
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <nav className="bg-white border-b border-zinc-100 px-6 py-4">
        <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-zinc-900">← Volver al panel</Link>
      </nav>

      <main className="max-w-lg mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-zinc-900 mb-2">Nuevo Cliente</h1>
        <p className="text-zinc-500 text-sm mb-8">Completa los datos básicos para generar el enlace de onboarding.</p>

        {!link ? (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-zinc-100 p-6 space-y-4">
            {[
              { label: 'Nombre completo del cliente', key: 'clientName', required: true },
              { label: 'Nombre de la marca (opcional)', key: 'brandName' },
              { label: 'Email del cliente (opcional)', key: 'email', type: 'email' },
              { label: 'Industria (opcional)', key: 'industry' },
              { label: 'País', key: 'country' },
            ].map(field => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-zinc-700 mb-1">{field.label}</label>
                <input
                  type={field.type || 'text'}
                  required={field.required}
                  value={form[field.key as keyof typeof form]}
                  onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>
            ))}

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Idioma preferido</label>
              <select
                value={form.language}
                onChange={e => setForm(prev => ({ ...prev, language: e.target.value }))}
                className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
              >
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-zinc-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-zinc-700 transition disabled:opacity-50">
              {loading ? 'Generando...' : 'Generar Enlace de Onboarding'}
            </button>
          </form>
        ) : (
          <div className="bg-white rounded-2xl border border-zinc-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600">✓</div>
              <p className="font-medium text-zinc-900">Enlace generado — válido por 7 días</p>
            </div>
            <div className="bg-zinc-50 rounded-lg p-3 text-sm text-zinc-600 break-all mb-4">{link}</div>
            <button onClick={copyLink}
              className="w-full border border-zinc-200 rounded-lg py-2 text-sm font-medium hover:bg-zinc-50 transition">
              {copied ? '¡Copiado! ✓' : 'Copiar enlace'}
            </button>
            <Link href="/dashboard" className="block text-center mt-4 text-sm text-zinc-500 hover:text-zinc-900">
              Ver todos los clientes →
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
```

**Step 3: Test**

Go to http://localhost:3000/dashboard/nuevo
Fill form → click "Generar Enlace" → should see the link appear and be copyable

**Step 4: Commit**

```bash
git add app/
git commit -m "feat: add new client form with onboarding link generation"
```

---

## Task 6: Client Onboarding — Language Screen + Progress Shell

**Files:**
- Create: `app/(public)/onboarding/[token]/page.tsx`
- Create: `app/(public)/onboarding/[token]/layout.tsx`
- Create: `app/api/onboarding/[token]/route.ts`
- Create: `app/api/onboarding/[token]/save/route.ts`

**Step 1: Create API to fetch session by token**

```typescript
// app/api/onboarding/[token]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const session = await db.onboardingSession.findUnique({ where: { token } })

  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (session.expiresAt < new Date()) return NextResponse.json({ error: 'Expired' }, { status: 410 })
  if (session.status === 'client_done') return NextResponse.json({ error: 'Already completed' }, { status: 409 })

  return NextResponse.json(session)
}
```

**Step 2: Create API to save progress**

```typescript
// app/api/onboarding/[token]/save/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const body = await req.json()

  const session = await db.onboardingSession.findUnique({ where: { token } })
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await db.onboardingSession.update({
    where: { token },
    data: body,
  })

  return NextResponse.json(updated)
}
```

**Step 3: Create the language selection page (Screen 0)**

```typescript
// app/(public)/onboarding/[token]/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function OnboardingStart() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/onboarding/${token}`)
      .then(res => {
        if (!res.ok) throw new Error('invalid')
        return res.json()
      })
      .catch(() => setError('Este enlace no es válido o ha expirado.'))
      .finally(() => setLoading(false))
  }, [token])

  async function selectLanguage(lang: 'es' | 'en') {
    await fetch(`/api/onboarding/${token}/save`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: lang }),
    })
    router.push(`/onboarding/${token}/paso/1`)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
    </div>
  )

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-6">
      <div className="text-center">
        <p className="text-zinc-900 font-medium mb-2">Enlace inválido</p>
        <p className="text-zinc-500 text-sm">{error}</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-6">
      <div className="text-center max-w-sm">
        <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <span className="text-white font-bold text-lg">A</span>
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 mb-2">Avilion / Humind</h1>
        <p className="text-zinc-500 mb-10 text-sm">Elige tu idioma · Choose your language</p>
        <div className="flex gap-4 justify-center">
          <button onClick={() => selectLanguage('es')}
            className="flex-1 bg-white border-2 border-zinc-200 rounded-2xl p-6 hover:border-zinc-900 transition cursor-pointer">
            <div className="text-3xl mb-2">🇪🇸</div>
            <div className="font-medium text-zinc-900">Español</div>
          </button>
          <button onClick={() => selectLanguage('en')}
            className="flex-1 bg-white border-2 border-zinc-200 rounded-2xl p-6 hover:border-zinc-900 transition cursor-pointer">
            <div className="text-3xl mb-2">🇺🇸</div>
            <div className="font-medium text-zinc-900">English</div>
          </button>
        </div>
      </div>
    </div>
  )
}
```

**Step 4: Test**

Run the dev server, go to the link generated in Task 5.
Expected: Language selection screen appears with ES/EN buttons.
Click Español → should redirect to `/onboarding/[token]/paso/1` (404 is fine for now).

**Step 5: Commit**

```bash
git add app/
git commit -m "feat: add onboarding start — language selection screen"
```

---

## Task 7: Onboarding Steps 1–6 (Client Interview)

**Files:**
- Create: `app/(public)/onboarding/[token]/paso/[step]/page.tsx`
- Create: `components/onboarding/StepWelcome.tsx`
- Create: `components/onboarding/StepBasics.tsx`
- Create: `components/onboarding/StepBusiness.tsx`
- Create: `components/onboarding/StepSoul.tsx`
- Create: `components/onboarding/StepAudience.tsx`
- Create: `components/onboarding/StepVision.tsx`
- Create: `components/onboarding/ProgressBar.tsx`

**Step 1: Create `ProgressBar` component**

```typescript
// components/onboarding/ProgressBar.tsx
export function ProgressBar({ step, total }: { step: number; total: number }) {
  const pct = Math.round((step / total) * 100)
  return (
    <div className="w-full bg-zinc-100 rounded-full h-1 mb-8">
      <div className="bg-zinc-900 h-1 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
    </div>
  )
}
```

**Step 2: Create the step shell page** (loads correct step component)

```typescript
// app/(public)/onboarding/[token]/paso/[step]/page.tsx
'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type { Lang } from '@/lib/i18n'
import { StepWelcome } from '@/components/onboarding/StepWelcome'
import { StepBasics } from '@/components/onboarding/StepBasics'
import { StepBusiness } from '@/components/onboarding/StepBusiness'
import { StepSoul } from '@/components/onboarding/StepSoul'
import { StepAudience } from '@/components/onboarding/StepAudience'
import { StepVision } from '@/components/onboarding/StepVision'

const TOTAL_STEPS = 6

export default function StepPage() {
  const { token, step } = useParams<{ token: string; step: string }>()
  const router = useRouter()
  const stepNum = parseInt(step)
  const [session, setSession] = useState<Record<string, string> | null>(null)
  const [saving, setSaving] = useState(false)

  const lang: Lang = (session?.language as Lang) ?? 'es'

  useEffect(() => {
    fetch(`/api/onboarding/${token}`)
      .then(r => r.json())
      .then(setSession)
      .catch(() => router.push(`/onboarding/${token}`))
  }, [token, router])

  const save = useCallback(async (data: Record<string, unknown>) => {
    setSaving(true)
    await fetch(`/api/onboarding/${token}/save`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    setSaving(false)
  }, [token])

  const goNext = useCallback(async (data: Record<string, unknown>) => {
    await save(data)
    if (stepNum >= TOTAL_STEPS) {
      await save({ status: 'client_done', completedAt: new Date().toISOString() })
      router.push(`/onboarding/${token}/gracias`)
    } else {
      router.push(`/onboarding/${token}/paso/${stepNum + 1}`)
    }
  }, [save, stepNum, token, router])

  const goBack = useCallback(() => {
    if (stepNum <= 1) router.push(`/onboarding/${token}`)
    else router.push(`/onboarding/${token}/paso/${stepNum - 1}`)
  }, [stepNum, token, router])

  if (!session) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
    </div>
  )

  const props = { lang, session, saving, onNext: goNext, onBack: goBack, step: stepNum, total: TOTAL_STEPS }

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-lg mx-auto px-6 py-10">
        {stepNum === 1 && <StepWelcome {...props} />}
        {stepNum === 2 && <StepBasics {...props} />}
        {stepNum === 3 && <StepBusiness {...props} />}
        {stepNum === 4 && <StepSoul {...props} />}
        {stepNum === 5 && <StepAudience {...props} />}
        {stepNum === 6 && <StepVision {...props} />}
      </div>
    </div>
  )
}
```

**Step 3: Create shared StepProps type** in `components/onboarding/types.ts`

```typescript
// components/onboarding/types.ts
import type { Lang } from '@/lib/i18n'

export interface StepProps {
  lang: Lang
  session: Record<string, string>
  saving: boolean
  step: number
  total: number
  onNext: (data: Record<string, unknown>) => Promise<void>
  onBack: () => void
}
```

**Step 4: Create each step component** — implement all 6 following this pattern.

`StepWelcome.tsx`:
```typescript
// components/onboarding/StepWelcome.tsx
import { ProgressBar } from './ProgressBar'
import { getText } from '@/lib/i18n'
import type { StepProps } from './types'

export function StepWelcome({ lang, session, onNext, step, total }: StepProps) {
  const name = session.clientName?.split(' ')[0] || ''
  return (
    <div>
      <ProgressBar step={step} total={total} />
      <div className="text-center py-12">
        <div className="w-14 h-14 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <span className="text-white font-bold text-xl">A</span>
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 mb-3">
          {name ? `${getText(lang, 'welcome')}, ${name}` : getText(lang, 'welcome')}
        </h1>
        <p className="text-zinc-500 mb-10 max-w-sm mx-auto">{getText(lang, 'welcomeSubtitle')}</p>
        <button onClick={() => onNext({})}
          className="bg-zinc-900 text-white px-8 py-3 rounded-xl font-medium hover:bg-zinc-700 transition">
          {getText(lang, 'begin')}
        </button>
      </div>
    </div>
  )
}
```

`StepBasics.tsx` — name, brand, industry, country, channels, handles, email, whatsapp:
```typescript
// components/onboarding/StepBasics.tsx
'use client'
import { useState } from 'react'
import { ProgressBar } from './ProgressBar'
import { getText, t } from '@/lib/i18n'
import type { StepProps } from './types'
import type { Lang } from '@/lib/i18n'

const CHANNEL_LIST = ['instagram', 'tiktok', 'youtube', 'email', 'linkedin', 'facebook', 'twitter']

export function StepBasics({ lang, session, saving, onNext, onBack, step, total }: StepProps) {
  const [form, setForm] = useState({
    clientName: session.clientName || '',
    brandName: session.brandName || '',
    industry: session.industry || '',
    country: session.country || '',
    email: session.email || '',
    whatsapp: session.whatsapp || '',
    channels: session.channels ? JSON.parse(session.channels) : [] as Array<{channel: string, handle: string}>,
  })

  function toggleChannel(ch: string) {
    setForm(prev => {
      const exists = prev.channels.find((c: {channel: string}) => c.channel === ch)
      if (exists) return { ...prev, channels: prev.channels.filter((c: {channel: string}) => c.channel !== ch) }
      return { ...prev, channels: [...prev.channels, { channel: ch, handle: '' }] }
    })
  }

  function setHandle(ch: string, handle: string) {
    setForm(prev => ({
      ...prev,
      channels: prev.channels.map((c: {channel: string, handle: string}) =>
        c.channel === ch ? { ...c, handle } : c
      ),
    }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onNext({ ...form, channels: JSON.stringify(form.channels) })
  }

  return (
    <div>
      <ProgressBar step={step} total={total} />
      <h2 className="text-xl font-bold text-zinc-900 mb-6">{getText(lang, 'step2Title')}</h2>
      <form onSubmit={handleSubmit} className="space-y-5">
        {[
          { label: getText(lang, 'fullName'), key: 'clientName', required: true },
          { label: getText(lang, 'brandName'), key: 'brandName' },
          { label: getText(lang, 'industry'), key: 'industry' },
          { label: getText(lang, 'country'), key: 'country' },
          { label: getText(lang, 'email'), key: 'email', type: 'email' },
          { label: getText(lang, 'whatsapp'), key: 'whatsapp' },
        ].map(f => (
          <div key={f.key}>
            <label className="block text-sm font-medium text-zinc-700 mb-1">{f.label}</label>
            <input type={f.type || 'text'} required={f.required}
              value={form[f.key as keyof typeof form] as string}
              onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
              className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </div>
        ))}

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">{getText(lang, 'activeChannels')}</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {CHANNEL_LIST.map(ch => {
              const active = form.channels.find((c: {channel: string}) => c.channel === ch)
              return (
                <button key={ch} type="button" onClick={() => toggleChannel(ch)}
                  className={`px-3 py-1 rounded-full text-sm border transition ${active ? 'bg-zinc-900 text-white border-zinc-900' : 'border-zinc-200 text-zinc-600 hover:border-zinc-400'}`}>
                  {t[lang as Lang].channels[ch as keyof typeof t.es.channels] ?? ch}
                </button>
              )
            })}
          </div>
          {form.channels.map((c: {channel: string, handle: string}) => (
            <div key={c.channel} className="flex items-center gap-2 mb-2">
              <span className="text-sm text-zinc-500 w-24 shrink-0">{getText(lang, 'socialHandle')} {c.channel}:</span>
              <input value={c.handle} onChange={e => setHandle(c.channel, e.target.value)}
                placeholder={`@usuario`}
                className="flex-1 border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none" />
            </div>
          ))}
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onBack}
            className="flex-1 border border-zinc-200 rounded-xl py-3 text-sm font-medium hover:bg-zinc-50 transition">
            {getText(lang, 'back')}
          </button>
          <button type="submit" disabled={saving}
            className="flex-1 bg-zinc-900 text-white rounded-xl py-3 text-sm font-medium hover:bg-zinc-700 transition disabled:opacity-50">
            {saving ? getText(lang, 'saving') : getText(lang, 'next')}
          </button>
        </div>
      </form>
    </div>
  )
}
```

Implement `StepBusiness.tsx`, `StepSoul.tsx`, `StepAudience.tsx`, `StepVision.tsx` following the same pattern — each has a form with the fields defined in the design doc, uses `getText(lang, ...)` for labels, saves to onboarding session, and has back/next buttons.

**Step 5: Create thank you page**

```typescript
// app/(public)/onboarding/[token]/gracias/page.tsx
import { db } from '@/lib/db'
import { getText } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'

export default async function GraciasPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const session = await db.onboardingSession.findUnique({ where: { token } })
  const lang = (session?.language ?? 'es') as Lang
  const name = session?.clientName?.split(' ')[0] || ''

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">✓</div>
        <h1 className="text-2xl font-bold text-zinc-900 mb-3">
          {getText(lang, 'thankYouTitle').replace('[nombre]', name)}
        </h1>
        <p className="text-zinc-500">{getText(lang, 'thankYouSubtitle')}</p>
      </div>
    </div>
  )
}
```

**Step 6: Test full client flow**

Go to the onboarding link → select language → complete all 6 steps → see thank you screen.
Check the dashboard → status should change to "En Revisión".

**Step 7: Commit**

```bash
git add app/ components/
git commit -m "feat: add full client onboarding interview — 6 steps + confirmation"
```

---

## Task 8: Team Client View — 5 Tabs

**Files:**
- Create: `app/(team)/dashboard/cliente/[id]/page.tsx`
- Create: `app/(team)/dashboard/cliente/[id]/TabPerfil.tsx`
- Create: `app/(team)/dashboard/cliente/[id]/TabContenido.tsx`
- Create: `app/(team)/dashboard/cliente/[id]/TabFunnel.tsx`
- Create: `app/(team)/dashboard/cliente/[id]/TabGate.tsx`
- Create: `app/api/clients/[id]/profile/route.ts`

**Step 1: Create profile save API**

```typescript
// app/api/clients/[id]/profile/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await db.onboardingSession.findUnique({ where: { id }, include: { client: { include: { profile: true } } } })
  return NextResponse.json(session)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  const session = await db.onboardingSession.findUnique({ where: { id } })
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Ensure client exists
  let client = session.clientId ? await db.client.findUnique({ where: { id: session.clientId } }) : null

  if (!client) {
    client = await db.client.create({
      data: {
        name: session.clientName,
        brandName: session.brandName,
        email: session.email,
        industry: session.industry || 'General',
        country: session.country || 'Colombia',
        language: session.language,
      },
    })
    await db.onboardingSession.update({ where: { id }, data: { clientId: client.id } })
  }

  // Upsert profile
  const profile = await db.clientProfile.upsert({
    where: { clientId: client.id },
    create: { clientId: client.id, ...body },
    update: body,
  })

  // Update session status
  if (body._status) {
    await db.onboardingSession.update({ where: { id }, data: { status: body._status, agencyReviewApproved: true } })
  }

  return NextResponse.json(profile)
}
```

**Step 2: Create the tabbed client view page**

```typescript
// app/(team)/dashboard/cliente/[id]/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { TabPerfil } from './TabPerfil'
import { TabContenido } from './TabContenido'
import { TabFunnel } from './TabFunnel'
import { TabGate } from './TabGate'

const TABS = ['Perfil Profundo', 'Contenido', 'Funnel', 'Gate Filosófico', 'Finalizar']

export default function ClientePage() {
  const { id } = useParams<{ id: string }>()
  const [activeTab, setActiveTab] = useState(0)
  const [data, setData] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    fetch(`/api/clients/${id}/profile`).then(r => r.json()).then(setData)
  }, [id])

  async function saveProfile(fields: Record<string, unknown>) {
    await fetch(`/api/clients/${id}/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })
  }

  if (!data) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" /></div>

  return (
    <div className="min-h-screen bg-zinc-50">
      <nav className="bg-white border-b border-zinc-100 px-6 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-zinc-900">← Panel</Link>
        <div>
          <span className="font-semibold text-zinc-900">{data.clientName as string}</span>
          {data.brandName && <span className="text-zinc-400 ml-2">· {data.brandName as string}</span>}
        </div>
        <span className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full">{data.status as string}</span>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Summary card */}
        <div className="bg-white rounded-2xl border border-zinc-100 p-6 mb-6 grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-zinc-400">Email: </span><span>{data.email as string || '—'}</span></div>
          <div><span className="text-zinc-400">WhatsApp: </span><span>{data.whatsapp as string || '—'}</span></div>
          <div><span className="text-zinc-400">País: </span><span>{data.country as string || '—'}</span></div>
          <div><span className="text-zinc-400">Industria: </span><span>{data.industry as string || '—'}</span></div>
          <div className="col-span-2"><span className="text-zinc-400">Negocio: </span><span>{data.productDescription as string || '—'}</span></div>
          <div><span className="text-zinc-400">Precio: </span><span>${data.productPrice as string || '0'}</span></div>
          <div><span className="text-zinc-400">Ingresos/mes: </span><span>${data.monthlyRevenue as string || '0'}</span></div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-200 mb-6">
          {TABS.map((tab, i) => (
            <button key={tab} onClick={() => setActiveTab(i)}
              className={`px-4 py-3 text-sm font-medium transition border-b-2 -mb-px ${activeTab === i ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}>
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 0 && <TabPerfil data={data} onSave={saveProfile} />}
        {activeTab === 1 && <TabContenido data={data} onSave={saveProfile} />}
        {activeTab === 2 && <TabFunnel data={data} onSave={saveProfile} />}
        {activeTab === 3 && <TabGate data={data} onSave={saveProfile} />}
        {activeTab === 4 && <TabFinalizar sessionId={id} data={data} onSave={saveProfile} />}
      </div>
    </div>
  )
}
```

Each Tab component (`TabPerfil`, `TabContenido`, `TabFunnel`, `TabGate`) follows this pattern:
- Receives `data` (session data) and `onSave` callback
- Has a form with all fields for that section
- Has a "Guardar" button that calls `onSave(fields)`
- Shows a success toast when saved

**Step 3: Commit after building all tabs**

```bash
git add app/
git commit -m "feat: add team client view with 5 tabs for deep onboarding completion"
```

---

## Task 9: Gitea Integration

**Files:**
- Create: `lib/templates.ts`
- Create: `app/api/clients/[id]/finalize/route.ts`
- Create: `app/(team)/dashboard/cliente/[id]/TabFinalizar.tsx`

**Step 1: Create `lib/templates.ts`** — generates the 5 markdown files from session data

```typescript
// lib/templates.ts
// Reads the template files from the ecosistema repo and replaces placeholders

export function generatePerfil(data: Record<string, unknown>, lang: string): string {
  const values = data.values ? JSON.parse(data.values as string) : []
  const neverList = data.neverList ? JSON.parse(data.neverList as string) : []

  return `# PERFIL DEL CLIENTE — ${data.clientName || data.brandName}
## Ecosistema Avilion/Humind — Archivo Maestro del Proyecto

## Información Básica
| Campo | Valor |
|-------|-------|
| Nombre completo | ${data.clientName} |
| Nombre de la marca | ${data.brandName} |
| Industria | ${data.industry} |
| País | ${data.country} |
| Fecha de onboarding | ${new Date().toISOString().split('T')[0]} |
| Fase activa | Fase 1 |
| Idioma | ${lang} |
| Email | ${data.email} |
| WhatsApp | ${data.whatsapp} |
| Canales activos | ${data.channels ? JSON.parse(data.channels as string).map((c: {channel: string, handle: string}) => `${c.channel} (${c.handle})`).join(', ') : '—'} |

## Alma del Proyecto

### Propósito Fundacional
${data.purpose || '[Por completar]'}

### Valores No Negociables
${values.map((v: {name: string, description: string}, i: number) => `| ${i+1} | ${v.name} | ${v.description} |`).join('\n') || '| — | — | — |'}

### Líneas Que Nunca Se Cruzan
${neverList.map((n: string, i: number) => `${i+1}. ${n}`).join('\n') || '1. [Por completar]'}

### Visión a 3 Años
${data.vision3Years || '[Por completar]'}

## ICP — Cliente Ideal del Cliente
### Datos Demográficos
${data.icpDemographic || '[Por completar]'}

### Dolor Principal
${data.icpPain || '[Por completar]'}

### Deseo Principal
${data.icpDesire || '[Por completar]'}

---
*PERFIL.md — ${data.clientName} — Ecosistema Avilion/Humind*
*Creado: ${new Date().toISOString().split('T')[0]}*
`
}

export function generateITR(data: Record<string, unknown>): string {
  return `# ITR — INDICADORES DE TRANSFORMACIÓN REAL
## ${data.clientName} — Ecosistema Avilion/Humind

## Métricas Baseline (Día 0)
| Métrica | Baseline |
|---------|---------|
| Ingresos mensuales | $${data.monthlyRevenue || 0} |
| Canales activos | ${data.channels ? JSON.parse(data.channels as string).length : 0} |

## Estado del Caso de Éxito
- Días activos: 0 / 60 mínimo
- ITR Score acumulado: —% / 80% mínimo
- ESTADO: En inicio

---
*ITR.md — ${data.clientName} — Ecosistema Avilion/Humind*
*Creado: ${new Date().toISOString().split('T')[0]}*
`
}

export function generateContenidoMadre(data: Record<string, unknown>): string {
  return `# CONTENIDO MADRE — ${data.clientName}
## Estrategia de Contenido

## Alma del Contenido
**Emoción central:** ${(data as Record<string, unknown>).contentEmotion || '[Por completar por el equipo]'}
**Transformación buscada:** ${(data as Record<string, unknown>).contentTransformation || '[Por completar por el equipo]'}

## Pilares de Contenido
${(data as Record<string, unknown>).contentPillars ? JSON.parse((data as Record<string, unknown>).contentPillars as string).map((p: {name: string, pct: number, topics: string[]}, i: number) => `### Pilar ${i+1}: ${p.name} (${p.pct}%)\nTemas: ${p.topics?.join(', ')}`).join('\n\n') : '[Por completar por el equipo]'}

## Voz y Tono
**Adjetivos:** ${(data as Record<string, unknown>).voiceAdjectives ? JSON.parse((data as Record<string, unknown>).voiceAdjectives as string).join(', ') : '[Por completar]'}
**Vocabulario propio:** ${(data as Record<string, unknown>).voiceVocabulary || '[Por completar]'}
**Palabras prohibidas:** ${(data as Record<string, unknown>).voiceForbidden || '[Por completar]'}

---
*CONTENIDO_MADRE.md — ${data.clientName} — Ecosistema Avilion/Humind*
*Creado: ${new Date().toISOString().split('T')[0]}*
`
}

export function generateFunnel(data: Record<string, unknown>): string {
  return `# FUNNEL — ${data.clientName}
## Arquitectura de Conversión

## Tipo de Funnel
Tipo ${(data as Record<string, unknown>).funnelType || '—'}: ${(data as Record<string, unknown>).funnelReason || '[Por completar]'}

## Promesa de Valor Única
${(data as Record<string, unknown>).valuePromise || '[Por completar]'}

## Pricing
- **Entrada:** ${(data as Record<string, unknown>).pricingEntry ? JSON.stringify(JSON.parse((data as Record<string, unknown>).pricingEntry as string)) : '[Por completar]'}
- **Core:** ${(data as Record<string, unknown>).pricingCore ? JSON.stringify(JSON.parse((data as Record<string, unknown>).pricingCore as string)) : '[Por completar]'}
- **Premium:** ${(data as Record<string, unknown>).pricingPremium ? JSON.stringify(JSON.parse((data as Record<string, unknown>).pricingPremium as string)) : '[Por completar]'}

---
*FUNNEL.md — ${data.clientName} — Ecosistema Avilion/Humind*
*Creado: ${new Date().toISOString().split('T')[0]}*
`
}

export function generateClaude(data: Record<string, unknown>): string {
  return `# CLAUDE.md — CONTEXTO DE PROYECTO PARA CLAUDE CODE
## ${data.clientName} — Ecosistema Avilion/Humind

## Identidad del Cliente
**Nombre:** ${data.clientName}
**Marca:** ${data.brandName}
**Propósito:** ${data.purpose || '[Ver PERFIL.md]'}
**Estado emocional inicial:** ${(data as Record<string, unknown>).initialEmotionalState || 3}/5
**Fase activa:** Fase 1

## Tu Rol
Eres el agente integrado para el proyecto de **${data.clientName}**.
Alma sobre algoritmo. Siempre.

Antes de cualquier acción, leer PERFIL.md.

---
*CLAUDE.md — ${data.clientName} — Ecosistema Avilion/Humind*
*Creado: ${new Date().toISOString().split('T')[0]}*
`
}
```

**Step 2: Create finalize API route**

```typescript
// app/api/clients/[id]/finalize/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createFile } from '@/lib/gitea'
import { generatePerfil, generateITR, generateContenidoMadre, generateFunnel, generateClaude } from '@/lib/templates'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await db.onboardingSession.findUnique({
    where: { id },
    include: { client: { include: { profile: true } } },
  })
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const data = { ...session, ...(session.client?.profile ?? {}) }
  const slug = (session.brandName || session.clientName)
    .toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  const folderPath = `clientes/${slug}`
  const msg = (file: string) => `feat(client): add ${file} for ${session.clientName}`

  try {
    await createFile(`${folderPath}/PERFIL.md`, generatePerfil(data, session.language), msg('PERFIL.md'))
    await createFile(`${folderPath}/ITR.md`, generateITR(data), msg('ITR.md'))
    await createFile(`${folderPath}/CONTENIDO_MADRE.md`, generateContenidoMadre(data), msg('CONTENIDO_MADRE.md'))
    await createFile(`${folderPath}/FUNNEL.md`, generateFunnel(data), msg('FUNNEL.md'))
    await createFile(`${folderPath}/CLAUDE.md`, generateClaude(data), msg('CLAUDE.md'))

    if (session.client) {
      await db.clientProfile.upsert({
        where: { clientId: session.client.id },
        create: { clientId: session.client.id, giteaFolderCreated: true, giteaFolderPath: folderPath },
        update: { giteaFolderCreated: true, giteaFolderPath: folderPath },
      })
    }

    await db.onboardingSession.update({ where: { id }, data: { status: 'complete' } })

    return NextResponse.json({ ok: true, folderPath })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
```

**Step 3: Create `TabFinalizar` component**

```typescript
// app/(team)/dashboard/cliente/[id]/TabFinalizar.tsx
'use client'
import { useState } from 'react'

export function TabFinalizar({ sessionId, data }: { sessionId: string; data: Record<string, unknown>; onSave: (f: Record<string, unknown>) => Promise<void> }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<{ folderPath?: string; error?: string }>({})

  async function handleFinalize() {
    if (!confirm('¿Estás seguro? Esto creará la carpeta en Gitea y generará el PDF.')) return
    setStatus('loading')
    const res = await fetch(`/api/clients/${sessionId}/finalize`, { method: 'POST' })
    const json = await res.json()
    if (res.ok) { setStatus('done'); setResult(json) }
    else { setStatus('error'); setResult(json) }
  }

  const isComplete = data.status === 'complete'

  return (
    <div className="bg-white rounded-2xl border border-zinc-100 p-6">
      <h3 className="font-semibold text-zinc-900 mb-4">Finalizar Onboarding</h3>

      {isComplete ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 text-xl">✓</div>
          <p className="font-medium text-zinc-900">Onboarding completado</p>
          <p className="text-sm text-zinc-500 mt-1">Carpeta creada en Gitea: <code className="bg-zinc-50 px-1 rounded">{(data as Record<string, unknown>).giteaFolderPath as string}</code></p>
        </div>
      ) : (
        <>
          <div className="space-y-3 mb-6 text-sm text-zinc-600">
            <p>Al finalizar el sistema realizará lo siguiente:</p>
            <ul className="list-disc list-inside space-y-1 text-zinc-500">
              <li>Crear <code className="bg-zinc-50 px-1 rounded">clientes/[marca]/</code> en Gitea</li>
              <li>Generar PERFIL.md, ITR.md, CONTENIDO_MADRE.md, FUNNEL.md, CLAUDE.md pre-llenados</li>
              <li>Marcar el onboarding como completado</li>
            </ul>
          </div>

          {status === 'done' && (
            <div className="bg-green-50 text-green-700 rounded-lg p-3 text-sm mb-4">
              ✓ Carpeta creada: <code>{result.folderPath}</code>
            </div>
          )}
          {status === 'error' && (
            <div className="bg-red-50 text-red-700 rounded-lg p-3 text-sm mb-4">
              Error: {result.error}
            </div>
          )}

          <button onClick={handleFinalize} disabled={status === 'loading'}
            className="w-full bg-zinc-900 text-white rounded-xl py-3 text-sm font-semibold hover:bg-zinc-700 transition disabled:opacity-50">
            {status === 'loading' ? 'Creando en Gitea...' : 'Finalizar Onboarding →'}
          </button>
        </>
      )}
    </div>
  )
}
```

**Step 4: Test Gitea integration**

1. Get a Gitea API token (Settings → Applications → Generate Token)
2. Add it to `.env` as `GITEA_TOKEN`
3. Complete a full onboarding (client + team)
4. Click "Finalizar" → go to http://localhost:3000/avilion/ecosistema-avilion-humind → verify `clientes/[brand]/` folder was created

**Step 5: Commit**

```bash
git add lib/ app/
git commit -m "feat: add Gitea integration — auto-create client folder with 5 pre-filled templates"
```

---

## Task 10: PDF Generation

**Files:**
- Create: `app/api/clients/[id]/pdf/route.ts`
- Create: `components/pdf/OnboardingPDF.tsx`

**Step 1: Install PDF library**

```bash
npm install @react-pdf/renderer
```

**Step 2: Create the PDF component**

```typescript
// components/pdf/OnboardingPDF.tsx
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 12, color: '#666', marginBottom: 24 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 8, borderBottom: '1pt solid #eee', paddingBottom: 4 },
  row: { flexDirection: 'row', marginBottom: 4 },
  label: { fontSize: 10, color: '#666', width: 140 },
  value: { fontSize: 10, flex: 1 },
  body: { fontSize: 10, lineHeight: 1.5 },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, fontSize: 8, color: '#999', textAlign: 'center' },
})

export function OnboardingPDF({ data }: { data: Record<string, unknown> }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{data.brandName as string || data.clientName as string}</Text>
        <Text style={styles.subtitle}>Onboarding — Ecosistema Avilion/Humind · {new Date().toLocaleDateString('es')}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información Básica</Text>
          {[
            ['Nombre', data.clientName],
            ['Marca', data.brandName],
            ['Industria', data.industry],
            ['País', data.country],
            ['Email', data.email],
            ['WhatsApp', data.whatsapp],
          ].map(([label, val]) => (
            <View key={label} style={styles.row}>
              <Text style={styles.label}>{label}</Text>
              <Text style={styles.value}>{val as string || '—'}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alma del Proyecto</Text>
          <Text style={styles.body}>{data.purpose as string || '—'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Visión 3 Años</Text>
          <Text style={styles.body}>{data.vision3Years as string || '—'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ICP — Cliente Ideal</Text>
          <Text style={[styles.label, { marginBottom: 4 }]}>Perfil:</Text>
          <Text style={styles.body}>{data.icpDemographic as string || '—'}</Text>
          <Text style={[styles.label, { marginTop: 8, marginBottom: 4 }]}>Problema principal:</Text>
          <Text style={styles.body}>{data.icpPain as string || '—'}</Text>
          <Text style={[styles.label, { marginTop: 8, marginBottom: 4 }]}>Deseo principal:</Text>
          <Text style={styles.body}>{data.icpDesire as string || '—'}</Text>
        </View>

        <Text style={styles.footer}>Avilion / Humind · Alma sobre algoritmo. Siempre.</Text>
      </Page>
    </Document>
  )
}
```

**Step 3: Create PDF API route**

```typescript
// app/api/clients/[id]/pdf/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { db } from '@/lib/db'
import { OnboardingPDF } from '@/components/pdf/OnboardingPDF'
import React from 'react'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await db.onboardingSession.findUnique({
    where: { id },
    include: { client: { include: { profile: true } } },
  })
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const data = { ...session, ...(session.client?.profile ?? {}) }
  const buffer = await renderToBuffer(React.createElement(OnboardingPDF, { data }))

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="onboarding-${session.brandName || session.clientName}.pdf"`,
    },
  })
}
```

**Step 4: Add download button to TabFinalizar**

In `TabFinalizar.tsx`, add after the finalize button:
```typescript
<a href={`/api/clients/${sessionId}/pdf`} target="_blank"
  className="block w-full text-center border border-zinc-200 rounded-xl py-3 text-sm font-medium hover:bg-zinc-50 transition mt-3">
  Descargar PDF →
</a>
```

**Step 5: Test**

Complete a full onboarding → click "Descargar PDF" → PDF should download with all client data.

**Step 6: Commit**

```bash
git add components/pdf/ app/api/
git commit -m "feat: add PDF generation for completed onboarding"
```

---

## Task 11: Final Polish + Run the App

**Step 1: Update `app/page.tsx`** to redirect based on auth

```typescript
// app/page.tsx
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'

export default async function Home() {
  const session = await getSession()
  if (session) redirect('/dashboard')
  else redirect('/login')
}
```

**Step 2: Add `.gitignore` entries**

```
.env
prisma/dev.db
prisma/dev.db-journal
node_modules/
.next/
```

**Step 3: Run the full app and test end-to-end**

```bash
npm run dev
```

Full test checklist:
- [ ] Go to http://localhost:3000 → redirects to /login
- [ ] Login with team@avilion.co / avilion2026! → redirects to /dashboard
- [ ] Create a new client → copy the link
- [ ] Open the link in a new tab → language screen appears
- [ ] Select Español → complete all 6 steps
- [ ] Back in dashboard → client shows "En Revisión"
- [ ] Open client → complete all 4 deep tabs
- [ ] Click "Finalizar" → Gitea folder created
- [ ] Download PDF → PDF generated correctly
- [ ] Go to http://localhost:3000 Gitea → verify clientes/[brand]/ exists

**Step 4: Final commit**

```bash
git add .
git commit -m "feat: complete Phase 1 onboarding portal — client interview, team dashboard, Gitea integration, PDF"
```

---

## Running the App

```bash
cd /c/projects/avilion-portal
npm run dev
```

- **Portal:** http://localhost:3000
- **Team login:** team@avilion.co / avilion2026!
- **Gitea:** http://localhost:3000 (already running)
- **DB viewer:** `npx prisma studio` → http://localhost:5555
