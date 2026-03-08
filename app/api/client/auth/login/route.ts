import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  if (!email || !password) {
    return NextResponse.json({ error: 'Email y contraseña requeridos' }, { status: 400 })
  }

  const clientUser = await db.clientUser.findUnique({ where: { email } })
  if (!clientUser) {
    return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 })
  }

  const valid = await bcrypt.compare(password, clientUser.passwordHash)
  if (!valid) {
    return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 })
  }

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  const clientSession = await db.clientSession.create({
    data: { clientId: clientUser.id, expiresAt },
  })

  const res = NextResponse.json({ ok: true, sessionId: clientUser.sessionId })
  res.cookies.set('client-session-token', clientSession.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  })
  return res
}
