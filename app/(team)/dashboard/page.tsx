import { requireSession } from '@/lib/auth'
import { db } from '@/lib/db'
import Link from 'next/link'

const STAGES = [
  { key: 'pending',    label: 'Esperando cliente', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  { key: 'client_done', label: 'En revisión',      color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { key: 'team_done',  label: 'Listo para aprobar', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { key: 'complete',   label: 'Finalizado',         color: 'bg-green-50 text-green-700 border-green-200' },
]

export default async function DashboardPage() {
  await requireSession()

  const sessions = await db.onboardingSession.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      blueprints: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  })

  const counts = {
    total: sessions.length,
    pending: sessions.filter(s => s.status === 'pending').length,
    review: sessions.filter(s => s.status === 'client_done' || s.status === 'team_done').length,
    complete: sessions.filter(s => s.status === 'complete').length,
  }

  const grouped = STAGES.reduce<Record<string, typeof sessions>>((acc, stage) => {
    acc[stage.key] = sessions.filter(s => s.status === stage.key)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Nav */}
      <nav className="bg-white border-b border-zinc-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <span className="font-bold text-zinc-900 text-lg">Avilion</span>
          <span className="text-zinc-300">|</span>
          <span className="text-sm text-zinc-500">Panel de operaciones</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/nuevo"
            className="bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 transition">
            + Nuevo cliente
          </Link>
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="text-sm text-zinc-400 hover:text-zinc-900 transition px-2 py-2">
              Salir
            </button>
          </form>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total clientes', value: counts.total, sub: 'en el sistema' },
            { label: 'Esperando formulario', value: counts.pending, sub: 'sin completar' },
            { label: 'En proceso', value: counts.review, sub: 'revisión o aprobación' },
            { label: 'Finalizados', value: counts.complete, sub: 'estrategia entregada' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-zinc-100 p-5">
              <p className="text-2xl font-bold text-zinc-900">{stat.value}</p>
              <p className="text-sm font-medium text-zinc-700 mt-0.5">{stat.label}</p>
              <p className="text-xs text-zinc-400 mt-0.5">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Pipeline */}
        <div>
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">Pipeline de clientes</h2>

          {sessions.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-zinc-100">
              <p className="text-zinc-400 text-sm">No hay clientes aún.</p>
              <Link href="/dashboard/nuevo" className="mt-3 inline-block text-sm text-zinc-700 underline">
                Crear el primer cliente
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {STAGES.map(stage => {
                const items = grouped[stage.key] ?? []
                if (items.length === 0) return null
                return (
                  <div key={stage.key}>
                    {/* Stage header */}
                    <div className="flex items-center gap-2 mb-2 mt-5 first:mt-0">
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${stage.color}`}>
                        {stage.label}
                      </span>
                      <span className="text-xs text-zinc-400">{items.length} {items.length === 1 ? 'cliente' : 'clientes'}</span>
                    </div>

                    {/* Items */}
                    <div className="space-y-2">
                      {items.map(session => {
                        const hasBlueprint = session.blueprints.length > 0
                        const approved = !!session.blueprints[0]?.agencyApprovedAt
                        return (
                          <Link key={session.id} href={`/dashboard/cliente/${session.id}`}
                            className="flex items-center justify-between bg-white rounded-xl border border-zinc-100 px-5 py-4 hover:border-zinc-300 hover:shadow-sm transition group">
                            <div className="flex items-center gap-4 min-w-0">
                              {/* Avatar */}
                              <div className="w-9 h-9 rounded-full bg-zinc-900 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
                                {(session.brandName || session.clientName || '?')[0].toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-zinc-900 truncate">
                                  {session.brandName || session.clientName || 'Sin nombre'}
                                </p>
                                <p className="text-xs text-zinc-400 truncate">
                                  {[session.clientName !== session.brandName && session.clientName, session.industry, session.country]
                                    .filter(Boolean).join(' · ') || session.email || '—'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                              {hasBlueprint && !approved && (
                                <span className="text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full font-medium">
                                  Estrategia lista
                                </span>
                              )}
                              {approved && (
                                <span className="text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-full font-medium">
                                  ✓ Aprobada
                                </span>
                              )}
                              <span className="text-xs text-zinc-400">
                                {new Date(session.createdAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                              </span>
                              <svg className="w-4 h-4 text-zinc-300 group-hover:text-zinc-500 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </main>
    </div>
  )
}
