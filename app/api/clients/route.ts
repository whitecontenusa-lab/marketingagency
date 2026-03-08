import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const clients = await db.client.findMany({
      include: { onboardingSessions: { orderBy: { createdAt: 'desc' }, take: 1 } },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(clients)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, string>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const name = body.name?.trim()
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  try {
    const client = await db.client.create({
      data: {
        name: name,
        brandName: body.brandName,
        email: body.email,
        industry: body.industry || 'General',
        country: body.country || 'Colombia',
        language: body.language || 'es',
      },
    })
    return NextResponse.json(client, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 })
  }
}
