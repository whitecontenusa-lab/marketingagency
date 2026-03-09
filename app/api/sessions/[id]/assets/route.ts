import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads')

const ASSET_TYPES: Record<string, string> = {
  'image/png': 'logo', 'image/svg+xml': 'logo', 'image/jpeg': 'photos',
  'image/webp': 'photos', 'application/pdf': 'brand_guide',
  'application/zip': 'fonts', 'font/ttf': 'fonts', 'font/otf': 'fonts',
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const typeOverride = formData.get('type') as string | null

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (file.size > 20 * 1024 * 1024) return NextResponse.json({ error: 'File too large (max 20MB)' }, { status: 400 })

  const assetType = typeOverride || ASSET_TYPES[file.type] || 'other'
  const ext = file.name.split('.').pop() ?? 'bin'
  const safeName = `${id}-${Date.now()}-${assetType}.${ext}`
  const sessionDir = path.join(UPLOAD_DIR, id)

  await mkdir(sessionDir, { recursive: true })
  const filePath = path.join(sessionDir, safeName)
  await writeFile(filePath, Buffer.from(await file.arrayBuffer()))

  const asset = await db.onboardingAsset.create({
    data: {
      sessionId: id,
      type: assetType,
      label: file.name,
      fileName: safeName,
      filePath: `/uploads/${id}/${safeName}`,
      fileSize: file.size,
      mimeType: file.type,
    },
  })

  return NextResponse.json(asset)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { assetId } = await req.json()

  const asset = await db.onboardingAsset.findFirst({ where: { id: assetId, sessionId: id } })
  if (!asset) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.onboardingAsset.delete({ where: { id: assetId } })
  return NextResponse.json({ ok: true })
}
