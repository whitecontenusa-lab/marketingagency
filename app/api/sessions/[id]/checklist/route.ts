import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

const DEFAULT_CHECKLIST = [
  { key: 'logo_uploaded',      label: 'Logo de la marca (PNG/SVG)' },
  { key: 'brand_colors',       label: 'Paleta de colores definida' },
  { key: 'brand_fonts',        label: 'Tipografías de marca' },
  { key: 'social_handles',     label: 'Redes sociales activas' },
  { key: 'product_photos',     label: 'Fotos del producto o servicio' },
  { key: 'bio_written',        label: 'Bio / historia del fundador' },
  { key: 'access_granted',     label: 'Accesos a cuentas entregados' },
]

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  // Ensure checklist items exist for this session
  await Promise.all(DEFAULT_CHECKLIST.map(item =>
    db.checklistItem.upsert({
      where: { sessionId_key: { sessionId: id, key: item.key } },
      create: { sessionId: id, key: item.key, label: item.label },
      update: {},
    })
  ))

  const items = await db.checklistItem.findMany({ where: { sessionId: id }, orderBy: { key: 'asc' } })
  const assets = await db.onboardingAsset.findMany({ where: { sessionId: id }, orderBy: { uploadedAt: 'desc' } })
  return NextResponse.json({ items, assets })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { key, completed, notes } = await req.json()

  const item = await db.checklistItem.update({
    where: { sessionId_key: { sessionId: id, key } },
    data: { completed, notes: notes ?? undefined, completedAt: completed ? new Date() : null },
  })
  return NextResponse.json(item)
}
