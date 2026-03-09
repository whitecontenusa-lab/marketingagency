import { requireSession } from '@/lib/auth'
import { db } from '@/lib/db'
import Link from 'next/link'
import QueueActions from './QueueActions'

const PRIORITY_STYLES: Record<string, string> = {
  urgent: 'bg-red-50 text-red-700 border-red-200',
  high:   'bg-orange-50 text-orange-700 border-orange-200',
  normal: 'bg-zinc-50 text-zinc-600 border-zinc-200',
}

const TYPE_LABELS: Record<string, string> = {
  strategy_review:  '📋 Estrategia',
  proposal_sent:    '📄 Propuesta',
  campaign_change:  '📢 Campaña',
  ethical_flag:     '⚠️ Ético',
  billing:          '💳 Facturación',
}

export default async function ColaPage() {
  await requireSession()

  const [pending, resolved] = await Promise.all([
    db.approvalItem.findMany({
      where: { status: 'pending' },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      include: { session: { select: { clientName: true, brandName: true, id: true } } },
    }),
    db.approvalItem.findMany({
      where: { status: { in: ['approved', 'rejected', 'skipped'] } },
      orderBy: { decidedAt: 'desc' },
      take: 20,
      include: { session: { select: { clientName: true, brandName: true, id: true } } },
    }),
  ])

  return (
    <div className="min-h-screen bg-zinc-50">
      <nav className="bg-white border-b border-zinc-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-zinc-400 hover:text-zinc-900 transition text-sm">← Panel</Link>
          <span className="text-zinc-300">|</span>
          <span className="font-semibold text-zinc-900">Cola de Aprobación</span>
          {pending.length > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{pending.length}</span>
          )}
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">

        {/* Pending */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">
            Pendientes de decisión ({pending.length})
          </h2>

          {pending.length === 0 ? (
            <div className="bg-white rounded-2xl border border-zinc-100 p-10 text-center">
              <p className="text-4xl mb-3">✓</p>
              <p className="text-zinc-900 font-semibold">Todo al día</p>
              <p className="text-zinc-400 text-sm mt-1">No hay items pendientes de aprobación.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map(item => (
                <div key={item.id} className="bg-white rounded-xl border border-zinc-100 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-medium text-zinc-500">
                          {TYPE_LABELS[item.type] ?? item.type}
                        </span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${PRIORITY_STYLES[item.priority] ?? PRIORITY_STYLES.normal}`}>
                          {item.priority}
                        </span>
                      </div>
                      <p className="font-semibold text-zinc-900">{item.title}</p>
                      {item.description && (
                        <p className="text-sm text-zinc-500 mt-1">{item.description}</p>
                      )}
                      {item.session && (
                        <Link href={`/dashboard/cliente/${item.session.id}`}
                          className="text-xs text-zinc-400 hover:text-zinc-700 mt-2 inline-block underline">
                          Ver cliente: {item.session.brandName || item.session.clientName}
                        </Link>
                      )}
                    </div>
                    <QueueActions itemId={item.id} sessionId={item.session?.id ?? null} type={item.type} />
                  </div>
                  <p className="text-xs text-zinc-300 mt-3">
                    {new Date(item.createdAt).toLocaleString('es-CO')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Resolved */}
        {resolved.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">
              Historial reciente
            </h2>
            <div className="space-y-2">
              {resolved.map(item => (
                <div key={item.id} className="bg-white rounded-xl border border-zinc-100 px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-700">{item.title}</p>
                    {item.decisionNote && <p className="text-xs text-zinc-400 mt-0.5">{item.decisionNote}</p>}
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      item.status === 'approved' ? 'bg-green-50 text-green-700' :
                      item.status === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-zinc-100 text-zinc-500'
                    }`}>
                      {item.status === 'approved' ? '✓ Aprobado' : item.status === 'rejected' ? '✗ Rechazado' : 'Omitido'}
                    </span>
                    <p className="text-xs text-zinc-300 mt-1">{item.decidedBy}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </main>
    </div>
  )
}
