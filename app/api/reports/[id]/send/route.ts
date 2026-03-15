import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { sendMonthlyReport } from '@/lib/mailer'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: sessionId } = await params
  const body = await req.json()
  const { reportId } = body as { reportId: string }

  if (!reportId) {
    return NextResponse.json({ error: 'reportId is required' }, { status: 400 })
  }

  // Fetch the report and make sure it belongs to this session and is client type
  const report = await db.clientReport.findFirst({
    where: { id: reportId, sessionId, type: 'client' },
  })

  if (!report) {
    return NextResponse.json(
      { error: 'Report not found or not a client report' },
      { status: 404 },
    )
  }

  // Get the ClientUser (email) for this session
  const clientUser = await db.clientUser.findUnique({
    where: { sessionId },
  })

  if (!clientUser) {
    return NextResponse.json(
      { error: 'No client user found for this session' },
      { status: 404 },
    )
  }

  // Get session data for names and language
  const onboarding = await db.onboardingSession.findUnique({
    where: { id: sessionId },
    select: { clientName: true, brandName: true, language: true },
  })

  if (!onboarding) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let reportContent: any
  try {
    reportContent = JSON.parse(report.content)
  } catch {
    return NextResponse.json({ error: 'Report content is corrupted' }, { status: 500 })
  }
  const lang = (onboarding.language === 'en' ? 'en' : 'es') as 'en' | 'es'
  const portalUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://avilion.io'

  await sendMonthlyReport({
    to: clientUser.email,
    clientName: onboarding.clientName,
    brandName: onboarding.brandName || onboarding.clientName,
    reportContent,
    month: report.month,
    year: report.year,
    portalUrl,
    language: lang,
  })

  // Mark as sent
  const updated = await db.clientReport.update({
    where: { id: reportId },
    data: { sentAt: new Date() },
  })

  return NextResponse.json(updated)
}
