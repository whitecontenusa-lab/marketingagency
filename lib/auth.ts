import { db } from './db'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function getSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session-token')?.value
  if (!token) return null

  const session = await db.session.findUnique({
    where: { token },
    include: { user: { include: { workspace: true } } },
  })

  if (!session || session.expiresAt < new Date()) return null
  return session
}

export async function getWorkspaceId(): Promise<string | null> {
  const session = await getSession()
  return session?.user?.workspaceId ?? null
}

export async function requireSession() {
  const session = await getSession()
  if (!session) redirect('/login')
  return session
}
