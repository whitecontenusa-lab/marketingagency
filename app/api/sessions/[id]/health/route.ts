import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const session = await db.onboardingSession.findUnique({
    where: { id },
    include: {
      blueprints: { orderBy: { createdAt: 'desc' }, take: 1 },
      checklist: true,
      proposals: { orderBy: { createdAt: 'desc' }, take: 1 },
      invoices: true,
      campaigns: { include: { pieces: { select: { id: true } } } },
      marketIntelligence: true,
    },
  })
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const blueprint = session.blueprints[0]
  const proposal = session.proposals[0]
  const checklistDone = session.checklist.filter(i => i.completed).length
  const checklistTotal = session.checklist.length || 7
  const totalPieces = session.campaigns.reduce((sum, c) => sum + c.pieces.length, 0)

  const breakdown = [
    {
      label: 'Onboarding completado',
      points: session.completedAt ? 20 : 0,
      max: 20,
      done: !!session.completedAt,
    },
    {
      label: 'Checklist de activos',
      points: checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 15) : 0,
      max: 15,
      done: checklistDone >= checklistTotal && checklistTotal > 0,
    },
    {
      label: 'Estrategia generada',
      points: blueprint ? 20 : 0,
      max: 20,
      done: !!blueprint,
    },
    {
      label: 'Estrategia aprobada',
      points: blueprint?.agencyApprovedAt ? 15 : 0,
      max: 15,
      done: !!blueprint?.agencyApprovedAt,
    },
    {
      label: 'Inteligencia de mercado',
      points: session.marketIntelligence ? 10 : 0,
      max: 10,
      done: !!session.marketIntelligence,
    },
    {
      label: 'Propuesta enviada',
      points: proposal && proposal.status !== 'draft' ? 10 : 0,
      max: 10,
      done: !!(proposal && proposal.status !== 'draft'),
    },
    {
      label: 'Piezas de contenido activas',
      points: totalPieces >= 6 ? 10 : Math.round((totalPieces / 6) * 10),
      max: 10,
      done: totalPieces >= 6,
    },
  ]

  const score = breakdown.reduce((sum, item) => sum + item.points, 0)

  return NextResponse.json({ score, breakdown })
}
