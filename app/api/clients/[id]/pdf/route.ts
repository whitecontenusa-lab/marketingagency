import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { renderToBuffer, DocumentProps } from '@react-pdf/renderer'
import React from 'react'
import OnboardingPDF from '@/components/pdf/OnboardingPDF'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    const onboarding = await db.onboardingSession.findUnique({
      where: { id },
      include: { client: { include: { profile: true } } },
    })
    if (!onboarding) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const element = React.createElement(OnboardingPDF, {
      session: onboarding as unknown as Record<string, unknown>,
    }) as React.ReactElement<DocumentProps>

    const buffer = await renderToBuffer(element)
    const uint8 = new Uint8Array(buffer)

    const clientName = (onboarding.clientName ?? 'cliente').replace(/\s+/g, '-').toLowerCase()

    return new NextResponse(uint8, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="perfil-${clientName}.pdf"`,
      },
    })
  } catch (err) {
    console.error('[pdf] render error', err)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
