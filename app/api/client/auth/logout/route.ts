import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const token = req.cookies.get('client-session-token')?.value

  if (token) {
    await db.clientSession.deleteMany({ where: { token } })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set('client-session-token', '', { expires: new Date(0), path: '/' })
  return res
}
