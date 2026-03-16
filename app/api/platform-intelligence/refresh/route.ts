import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { spawn } from 'child_process'

// POST /api/platform-intelligence/refresh
// Spawns the platform intelligence generator script in the background.
// Returns immediately — generation runs asynchronously.
// Team reviews drafts at /dashboard/plataformas.
export async function POST(req: NextRequest) {
  const teamSession = await getSession()
  const internalSecret = req.headers.get('x-internal-secret')
  const isInternal = !!internalSecret && internalSecret === process.env.PORTAL_INTERNAL_SECRET

  if (!teamSession && !isInternal) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use shell: true with a relative path so Turbopack doesn't try to bundle it as a module
  const proc = spawn('node scripts/generate-platform-intelligence.mjs', [], {
    env: {
      ...process.env,
      PORTAL_URL: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001',
      PORTAL_INTERNAL_SECRET: process.env.PORTAL_INTERNAL_SECRET ?? '',
    },
    shell: true,
    detached: true,
    stdio: 'ignore',
  })

  proc.unref()

  console.log('[platform-intelligence/refresh] Background generation started, PID:', proc.pid)
  return NextResponse.json({
    queued: true,
    message: 'Platform intelligence generation started in background. Check /dashboard/plataformas for drafts in ~15-20 minutes.',
  })
}
