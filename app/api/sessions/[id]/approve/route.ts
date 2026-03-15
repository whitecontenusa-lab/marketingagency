import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { sendClientCredentials } from '@/lib/mailer'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const teamSession = await getSession()
  if (!teamSession) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const blueprint = await db.blueprint.findFirst({
    where: { sessionId: id },
    orderBy: { createdAt: 'desc' },
    include: { session: true },
  })
  if (!blueprint) return NextResponse.json({ error: 'No blueprint to approve' }, { status: 404 })

  // Parse the strategy JSON
  let strategy: Record<string, unknown>
  try {
    strategy = JSON.parse(blueprint.contentMd)
  } catch {
    return NextResponse.json({ error: 'Invalid blueprint data' }, { status: 500 })
  }

  const docs = strategy.documents as Record<string, string>
  const session = blueprint.session
  const folderName = (session.brandName || session.clientName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  const GITEA_URL = process.env.GITEA_URL || 'http://localhost:3000'
  const GITEA_TOKEN = process.env.GITEA_TOKEN
  const GITEA_OWNER = process.env.GITEA_REPO_OWNER || 'avilion'
  const GITEA_REPO = process.env.GITEA_REPO_NAME || 'ecosistema-avilion-humind'

  const files: Record<string, string> = {
    [`clientes/${folderName}/PERFIL.md`]: docs.perfil ?? '',
    [`clientes/${folderName}/FUNNEL.md`]: docs.funnel ?? '',
    [`clientes/${folderName}/CONTENIDO_MADRE.md`]: docs.contenido ?? '',
    [`clientes/${folderName}/ITR.md`]: docs.itr ?? '',
    ...(docs.roadmap ? { [`clientes/${folderName}/PLAN_90_DIAS.md`]: docs.roadmap } : {}),
    [`clientes/${folderName}/CLAUDE.md`]: buildClaudeFile(session as unknown as Record<string, unknown>, strategy),
  }

  const giteaErrors: string[] = []

  if (GITEA_TOKEN) {
    for (const [path, content] of Object.entries(files)) {
      try {
        const encoded = Buffer.from(content).toString('base64')
        const res = await fetch(`${GITEA_URL}/api/v1/repos/${GITEA_OWNER}/${GITEA_REPO}/contents/${path}`, {
          method: 'POST',
          headers: { 'Authorization': `token ${GITEA_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `feat(clients): add ${folderName} — strategy approved`,
            content: encoded,
          }),
        })
        if (!res.ok) {
          // Try updating if file already exists
          const getRes = await fetch(`${GITEA_URL}/api/v1/repos/${GITEA_OWNER}/${GITEA_REPO}/contents/${path}`, {
            headers: { 'Authorization': `token ${GITEA_TOKEN}` },
          })
          if (getRes.ok) {
            const existing = await getRes.json() as { sha: string }
            await fetch(`${GITEA_URL}/api/v1/repos/${GITEA_OWNER}/${GITEA_REPO}/contents/${path}`, {
              method: 'PUT',
              headers: { 'Authorization': `token ${GITEA_TOKEN}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                message: `chore(clients): update ${folderName} strategy`,
                content: encoded,
                sha: existing.sha,
              }),
            })
          }
        }
      } catch (err) {
        giteaErrors.push(String(err))
      }
    }
  }

  // Mark blueprint as approved
  await db.blueprint.update({
    where: { id: blueprint.id },
    data: { agencyApprovedAt: new Date() },
  })

  // Mark session as complete
  await db.onboardingSession.update({
    where: { id },
    data: { status: 'complete', agencyReviewApproved: true },
  })

  // Create client portal credentials (only if not already created)
  let tempPassword: string | null = null
  if (session.email) {
    tempPassword = crypto.randomBytes(8).toString('hex')
    const passwordHash = await bcrypt.hash(tempPassword, 10)
    const existing = await db.clientUser.findUnique({ where: { sessionId: id } })
    if (existing) {
      // Don't overwrite existing credentials
      tempPassword = null
    } else {
      await db.clientUser.create({
        data: {
          email: session.email,
          passwordHash,
          sessionId: id,
          mustResetPwd: true,
        },
      })

      // Send credentials email (non-blocking — don't fail approval if email fails)
      const portalUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3001'}/cliente/portal/${id}`
      sendClientCredentials({
        to: session.email,
        clientName: session.clientName,
        brandName: session.brandName,
        password: tempPassword,
        portalUrl,
        language: session.language === 'en' ? 'en' : 'es',
      }).catch(err => console.error('[mailer] Failed to send credentials email:', err))
    }
  }

  // Auto-seed checklist if empty
  const existingItems = await db.checklistItem.count({ where: { sessionId: id } })
  if (existingItems === 0) {
    const defaults = [
      'Logo y variantes entregados',
      'Accesos a redes sociales configurados',
      'Credenciales del portal enviadas al cliente',
      'Guía de marca compartida con el equipo',
      'Banco de fotografías recibido',
      'Revisión de copy aprobada',
      'Calendario editorial del primer mes listo',
    ]
    await db.checklistItem.createMany({
      data: defaults.map(label => ({
        sessionId: id,
        key: label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
        label,
        completed: false,
      })),
    })
  }

  return NextResponse.json({ ok: true, folder: folderName, giteaErrors, tempPassword, clientEmail: session.email })
}

function buildClaudeFile(session: Record<string, unknown>, strategy: Record<string, unknown>): string {
  const name = String(session.brandName || session.clientName)
  const lang = String(session.language ?? 'es')
  const isEs = lang !== 'en'
  const funnel = Number(strategy.funnelType ?? 1)
  const archetype = String(strategy.emotionalArchetype ?? 'El Constructor')

  return isEs
    ? `# CLAUDE.md — ${name}

## Tu rol
Eres el agente estratégico dedicado de ${name} dentro del ecosistema Avilion/Humind.
Cuando leas este archivo, asumes el contexto completo de este cliente y operas como su estratega de marketing personal.

## Cliente
- **Marca:** ${name}
- **Industria:** ${session.industry}
- **País:** ${session.country}
- **Etapa:** ${session.businessStage}
- **Funnel activo:** Funnel ${funnel}
- **Arquetipo emocional:** ${archetype}

## Propósito de la marca
${session.purpose}

## Instrucciones permanentes
1. Siempre habla desde el arquetipo ${archetype}
2. Toda decisión de contenido pasa primero por el propósito de la marca
3. El cliente ideal tiene este dolor: "${session.icpPain}"
4. El cliente ideal desea: "${session.icpDesire}"
5. Nunca hagas: ${session.neverList}

## Archivos de referencia
- PERFIL.md → Identidad y audiencia profunda
- FUNNEL.md → Arquitectura de conversión activa
- CONTENIDO_MADRE.md → Pilares y voz de marca
- ITR.md → Métricas y criterios de éxito

## Cómo responder
Cuando el equipo de Avilion trabaje en este cliente, usa este contexto para:
- Generar ideas de contenido alineadas al arquetipo
- Revisar si las decisiones respetan la lista de nunca
- Sugerir mejoras al funnel basadas en métricas ITR
- Mantener coherencia narrativa en todo momento
`
    : `# CLAUDE.md — ${name}

## Your role
You are the dedicated strategy agent for ${name} within the Avilion/Humind ecosystem.
When you read this file, you assume the complete context of this client and operate as their personal marketing strategist.

## Client
- **Brand:** ${name}
- **Industry:** ${session.industry}
- **Country:** ${session.country}
- **Stage:** ${session.businessStage}
- **Active funnel:** Funnel ${funnel}
- **Emotional archetype:** ${archetype}

## Brand purpose
${session.purpose}

## Permanent instructions
1. Always speak from the ${archetype} archetype
2. Every content decision passes through the brand purpose first
3. The ideal client has this pain: "${session.icpPain}"
4. The ideal client desires: "${session.icpDesire}"
5. Never do: ${session.neverList}

## Reference files
- PERFIL.md → Identity and deep audience
- FUNNEL.md → Active conversion architecture
- CONTENIDO_MADRE.md → Pillars and brand voice
- ITR.md → Metrics and success criteria
`
}
