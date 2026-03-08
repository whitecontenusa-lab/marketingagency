import { db } from './db'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function getClientSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get('client-session-token')?.value
  if (!token) return null

  const session = await db.clientSession.findUnique({
    where: { token },
    include: { client: true },
  })

  if (!session || session.expiresAt < new Date()) return null
  return session
}

export async function requireClientSession() {
  const session = await getClientSession()
  if (!session) redirect('/cliente/login')
  return session
}
