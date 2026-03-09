import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

const PLAN_LIMITS: Record<string, number> = {
  free: 3,
  starter: 10,
  pro: 50,
  agency: 999,
}

export async function POST(req: NextRequest) {
  const { agencyName, email, password, plan = 'starter' } = await req.json()

  if (!agencyName || !email || !password) {
    return NextResponse.json({ error: 'Todos los campos son requeridos' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })
  }

  // Check email not already taken
  const existing = await db.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'Este correo ya está registrado' }, { status: 400 })
  }

  // Generate workspace slug from agency name
  let slug = agencyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const slugExists = await db.workspace.findUnique({ where: { slug } })
  if (slugExists) slug = `${slug}-${Date.now().toString(36)}`

  const passwordHash = await bcrypt.hash(password, 10)

  // Create workspace + admin user in transaction
  const workspace = await db.workspace.create({
    data: {
      name: agencyName,
      slug,
      plan,
      planMaxClients: PLAN_LIMITS[plan] ?? 10,
    },
  })

  await db.user.create({
    data: {
      email,
      name: agencyName,
      passwordHash,
      workspaceId: workspace.id,
    },
  })

  return NextResponse.json({ ok: true, slug, workspaceId: workspace.id })
}
