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
