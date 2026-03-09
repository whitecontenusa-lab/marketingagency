import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const workspaceId = session.user.workspaceId
  if (!workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 404 })

  const [workspace, clientCount] = await Promise.all([
    db.workspace.findUnique({ where: { id: workspaceId } }),
    db.onboardingSession.count({ where: { workspaceId } }),
  ])

  return NextResponse.json({ ...workspace, clientCount })
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const workspaceId = session.user.workspaceId
  if (!workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 404 })

  const { name, logoUrl, primaryColor } = await req.json()
  const workspace = await db.workspace.update({
    where: { id: workspaceId },
    data: {
      ...(name ? { name } : {}),
      ...(logoUrl !== undefined ? { logoUrl } : {}),
      ...(primaryColor ? { primaryColor } : {}),
    },
  })

  return NextResponse.json(workspace)
}
