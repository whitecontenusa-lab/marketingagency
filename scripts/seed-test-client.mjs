/**
 * seed-test-client.mjs
 *
 * Creates a complete test client in the Avilion portal DB for E2E validation.
 * Covers: OnboardingSession, Blueprint, ContentCycle, 30 ContentPieces, ClientUser,
 *         Campaign, ChecklistItems, Proposal, Invoice.
 *
 * Usage:
 *   node scripts/seed-test-client.mjs
 *   node scripts/seed-test-client.mjs --clean   (removes prior seed data first)
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const db = new PrismaClient()
const SEED_EMAIL = 'test-seed@example.com'
const SEED_BRAND = 'Marca de Prueba'

// ─── Helpers ────────────────────────────────────────────────────────────────

function iso(daysFromNow = 0) {
  return new Date(Date.now() + daysFromNow * 86400000).toISOString()
}

const PLATFORMS = ['instagram', 'tiktok', 'facebook', 'linkedin', 'youtube', 'threads']
const FORMATS = ['reel', 'carrusel', 'post', 'historia', 'video_corto']
const STAGES = ['tofu', 'mofu', 'bofu']

function makePiece(i, cycleId, deliveryDate) {
  const platform = PLATFORMS[i % PLATFORMS.length]
  const format = FORMATS[i % FORMATS.length]
  const stage = STAGES[i % STAGES.length]
  const week = Math.ceil((i + 1) / 7.5) // 4 weeks of ~7–8 pieces

  return {
    platform,
    format,
    hook: `Hook de prueba #${i + 1} — ${platform} ${format}`,
    body: `Este es el cuerpo de la pieza #${i + 1}. Diseñado para la etapa ${stage} del funnel. El cliente ideal experimenta el dolor que esta pieza aborda directamente.`,
    cta: `Descubre más sobre ${SEED_BRAND}`,
    hashtags: `#prueba #seed #${platform} #avilion`,
    funnelStage: stage,
    week: Math.min(week, 4),
    status: i < 5 ? 'published' : i < 15 ? 'scheduled' : 'ready',
    scheduledAt: i < 20 ? new Date(deliveryDate.getTime() + i * 86400000 * 1.5).toISOString() : null,
    releasedAt: deliveryDate.toISOString(),
    aiGenerated: true,
    cycleId,
    // Metrics for "published" pieces
    impressions: i < 5 ? Math.floor(Math.random() * 5000) + 500 : 0,
    reach: i < 5 ? Math.floor(Math.random() * 3000) + 300 : 0,
    engagementRate: i < 5 ? Math.random() * 8 + 1 : 0,
    saves: i < 5 ? Math.floor(Math.random() * 200) : 0,
    shares: i < 5 ? Math.floor(Math.random() * 80) : 0,
    metricsUpdatedAt: i < 5 ? new Date().toISOString() : null,
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const clean = process.argv.includes('--clean')

  if (clean) {
    console.log('🧹 Cleaning previous seed data...')
    const existing = await db.onboardingSession.findFirst({ where: { email: SEED_EMAIL } })
    if (existing) {
      // cascade order matters
      const cycles = await db.contentCycle.findMany({ where: { sessionId: existing.id } })
      for (const c of cycles) {
        await db.contentPiece.deleteMany({ where: { cycleId: c.id } })
      }
      await db.contentPiece.deleteMany({ where: { sessionId: existing.id } })
      await db.contentCycle.deleteMany({ where: { sessionId: existing.id } })
      await db.checklistItem.deleteMany({ where: { sessionId: existing.id } })
      await db.blueprint.deleteMany({ where: { sessionId: existing.id } })
      await db.proposal.deleteMany({ where: { sessionId: existing.id } })
      await db.campaign.deleteMany({ where: { sessionId: existing.id } })
      await db.clientUser.deleteMany({ where: { sessionId: existing.id } })
      await db.clientReport.deleteMany({ where: { sessionId: existing.id } }).catch(() => {})
      await db.onboardingSession.delete({ where: { id: existing.id } })
      console.log('✓ Cleaned session:', existing.id)
    } else {
      console.log('  No prior seed data found.')
    }
  }

  // ── 1. OnboardingSession ──────────────────────────────────────────────────
  console.log('\n📋 Creating OnboardingSession...')
  const token = crypto.randomBytes(12).toString('hex')
  const session = await db.onboardingSession.create({
    data: {
      token,
      clientName: 'Juan Prueba',
      brandName: SEED_BRAND,
      email: SEED_EMAIL,
      whatsapp: '+573001234567',
      country: 'Colombia',
      industry: 'E-commerce',
      businessStage: 'growth',
      businessType: 'physical_product',
      productDescription: 'Ropa deportiva sostenible para mujeres activas',
      specificProduct: '',
      targetAudience: 'Mujeres 25-40, activas, conscientes del medio ambiente',
      productPrice: '85',
      monthlyRevenue: '15000',
      revenueModel: '',
      purpose: 'Empoderar a la mujer activa a moverse sin culpa, con moda sostenible',
      icpPain: 'No encuentro ropa deportiva que dure y se vea bien sin dañar el planeta',
      icpDesire: 'Sentirme segura y linda mientras cuido mi cuerpo y el planeta',
      neverList: 'Greenwashing, promesas falsas, descuentos agresivos',
      platforms: 'instagram,tiktok,facebook',
      competitors: 'Lululemon, Adidas by Stella McCartney',
      differentiators: 'Materiales reciclados, tallas inclusivas, impacto social real',
      marketPosition: 'premium_sustainable',
      hasBranding: true,
      brandColors: 'Verde salvia #8FAF7A, Blanco hueso #FAF9F6, Terracota #C4704F',
      brandFonts: 'Playfair Display, Open Sans',
      brandLogoUrl: '',
      language: 'es',
      status: 'complete',
      agencyReviewApproved: true,
      completedAt: new Date(),
    },
  })
  console.log('  ✓ Session:', session.id, '| token:', token)

  // ── 2. Blueprint (strategy) ───────────────────────────────────────────────
  console.log('🧠 Creating Blueprint...')
  const strategyJson = {
    lang: 'es',
    funnelType: 3,
    funnelReason: 'La marca opera en el segmento premium donde la relación y confianza son el motor de compra. Funnel 3 prioriza comunidad y experiencia de marca sobre conversión directa.',
    emotionalArchetype: 'La Exploradora',
    emotionalArchetypeReason: 'La mujer activa que busca este producto quiere descubrir quién es cuando se libera de restricciones. La Exploradora la acompaña en ese viaje.',
    simulationNotes: 'En el mercado colombiano de ropa deportiva sostenible, el segmento premium crece ~22% anual. Competidores internacionales no localizan bien su mensaje. Oportunidad real de posicionarse como marca local de referencia.',
    documents: {
      perfil: '# Perfil Profundo\n\n## Audiencia Principal\nMujeres 25-40, profesionales, ingresos medios-altos, activas 3-5x por semana...',
      funnel: '# Arquitectura del Funnel 3\n\n## Fase 1 — Conciencia\nContenido educativo sobre sostenibilidad en moda...',
      contenido: '# Contenido Madre\n\n## Pilares de Contenido\n1. Movimiento consciente\n2. Impacto real\n3. Comunidad activa...',
      itr: '# ITR — Métricas de Éxito\n\n## KPIs Principales\n- Engagement rate: >4%\n- Alcance mensual: +15%\n- Ventas desde social: 20%...',
      roadmap: '# Plan 90 Días\n\n## Mes 1: Fundación\nEstablecer presencia orgánica en Instagram y TikTok...',
    },
  }

  const blueprint = await db.blueprint.create({
    data: {
      sessionId: session.id,
      contentMd: JSON.stringify(strategyJson),
      agencyApprovedAt: new Date(),
      deliveredAt: new Date(Date.now() - 2 * 86400000), // delivered 2 days ago
    },
  })
  console.log('  ✓ Blueprint:', blueprint.id)

  // ── 3. ClientUser ─────────────────────────────────────────────────────────
  console.log('👤 Creating ClientUser...')
  const passwordHash = await bcrypt.hash('test1234', 10)
  const clientUser = await db.clientUser.create({
    data: {
      email: SEED_EMAIL,
      passwordHash,
      sessionId: session.id,
      mustResetPwd: false,
    },
  })
  console.log('  ✓ ClientUser:', clientUser.id, '| password: test1234')

  // ── 4. ContentCycle (delivered) ───────────────────────────────────────────
  console.log('📦 Creating ContentCycle...')
  const deliveryDate = new Date(Date.now() - 86400000) // yesterday
  const cycle = await db.contentCycle.create({
    data: {
      sessionId: session.id,
      cycleNumber: 1,
      status: 'delivered',
      billingOk: true,
      adminApprovedAt: new Date(Date.now() - 5 * 86400000),
      generatedAt: new Date(Date.now() - 2 * 86400000),
      deliveryDate,
    },
  })
  console.log('  ✓ ContentCycle:', cycle.id)

  // ── 5. 30 ContentPieces ───────────────────────────────────────────────────
  console.log('✍️  Creating 30 ContentPieces...')
  const pieces = await db.contentPiece.createManyAndReturn({
    data: Array.from({ length: 30 }, (_, i) => ({
      sessionId: session.id,
      ...makePiece(i, cycle.id, deliveryDate),
    })),
  }).catch(async () => {
    // Fallback if createManyAndReturn not supported
    await db.contentPiece.createMany({
      data: Array.from({ length: 30 }, (_, i) => ({
        sessionId: session.id,
        ...makePiece(i, cycle.id, deliveryDate),
      })),
    })
    return []
  })
  console.log('  ✓ Created 30 pieces (', pieces.length || '30', 'records)')

  // ── 6. Campaign ───────────────────────────────────────────────────────────
  console.log('📣 Creating Campaign...')
  const campaign = await db.campaign.create({
    data: {
      sessionId: session.id,
      name: 'Lanzamiento Colección Otoño',
      objective: 'Generar 200 leads calificados en 30 días',
      channels: 'instagram,tiktok',
      status: 'active',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 86400000),
    },
  })
  console.log('  ✓ Campaign:', campaign.id)

  // ── 7. Checklist ──────────────────────────────────────────────────────────
  console.log('✅ Creating ChecklistItems...')
  const checklistItems = [
    { key: 'logo_entregado', label: 'Logo y variantes entregados', completed: true },
    { key: 'accesos_redes', label: 'Accesos a redes sociales configurados', completed: true },
    { key: 'credenciales_portal', label: 'Credenciales del portal enviadas al cliente', completed: true },
    { key: 'guia_marca', label: 'Guía de marca compartida con el equipo', completed: true },
    { key: 'banco_fotos', label: 'Banco de fotografías recibido', completed: false },
    { key: 'revision_copy', label: 'Revisión de copy aprobada', completed: false },
    { key: 'calendario_editorial', label: 'Calendario editorial del primer mes listo', completed: true },
  ]
  await db.checklistItem.createMany({
    data: checklistItems.map(item => ({ sessionId: session.id, ...item })),
  })
  console.log('  ✓ Created', checklistItems.length, 'checklist items')

  // ── 8. Proposal ───────────────────────────────────────────────────────────
  console.log('📄 Creating Proposal...')
  const proposal = await db.proposal.create({
    data: {
      sessionId: session.id,
      title: 'Propuesta Estratégica — Marca de Prueba',
      status: 'accepted',
      total: 2400,
      currency: 'USD',
      notes: 'Propuesta aceptada el 15 de marzo 2026. Incluye estrategia + 3 meses de contenido.',
      sentAt: new Date(Date.now() - 10 * 86400000),
      acceptedAt: new Date(Date.now() - 8 * 86400000),
    },
  })
  console.log('  ✓ Proposal:', proposal.id, '| $2,400 USD — accepted')

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(60))
  console.log('✅ SEED COMPLETE')
  console.log('═'.repeat(60))
  console.log('Session ID  :', session.id)
  console.log('Client email:', SEED_EMAIL)
  console.log('Password    :', 'test1234')
  console.log('Token       :', token)
  console.log('\nPortal URL  :', `http://localhost:3001/cliente/portal/${session.id}`)
  console.log('Team URL    :', `http://localhost:3001/dashboard/cliente/${session.id}`)
  console.log('Login URL   :', 'http://localhost:3001/cliente/login')
  console.log('═'.repeat(60))
}

main()
  .catch(err => { console.error('❌ Seed failed:', err); process.exit(1) })
  .finally(() => db.$disconnect())
