// app/(team)/dashboard/page.tsx
import { requireSession } from '@/lib/auth'
import { db } from '@/lib/db'
import Link from 'next/link'

const STATUS_LABELS: Record<string, string> = {
  pending: 'Esperando cliente',
  client_done: 'En revisión',
  team_done: 'Equipo listo',
  complete: 'Finalizado',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  client_done: 'bg-blue-50 text-blue-700',
  team_done: 'bg-purple-50 text-purple-700',
  complete: 'bg-green-50 text-green-700',
}

export default async function DashboardPage() {
  await requireSession()

  const sessions = await db.onboardingSession.findMany({
    orderBy: { createdAt: 'desc' },
    include: { client: true },
  })

  return (
    <div className="min-h-screen bg-zinc-50">
      <nav className="bg-white border-b border-zinc-100 px-6 py-4 flex items-center justify-between">
        <h1 className="font-bold text-zinc-900">Avilion — Panel</h1>
        <div className="flex items-center gap-4">
          <Link href="/dashboard/nuevo" className="bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 transition">
            + Nuevo Cliente
          </Link>
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="text-sm text-zinc-500 hover:text-zinc-900">Salir</button>
          </form>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <h2 className="text-xl font-semibold text-zinc-900 mb-6">Sesiones ({sessions.length})</h2>

        {sessions.length === 0 ? (
          <div className="text-center py-20 text-zinc-400">
            <p className="text-lg">No hay clientes aún</p>
            <Link href="/dashboard/nuevo" className="mt-4 inline-block text-sm text-zinc-600 underline">Crear el primer cliente</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map(session => (
              <Link key={session.id} href={`/dashboard/cliente/${session.id}`}
                className="block bg-white rounded-xl border border-zinc-100 px-6 py-4 hover:border-zinc-300 transition">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-zinc-900">{session.clientName || 'Sin nombre'}</p>
                    <p className="text-sm text-zinc-500">
                      {[session.brandName, session.industry, session.country].filter(Boolean).join(' · ') || '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-xs font-medium px-3 py-1 rounded-full ${STATUS_COLORS[session.status] ?? 'bg-zinc-100 text-zinc-600'}`}>
                      {STATUS_LABELS[session.status] ?? session.status}
                    </span>
                    <span className="text-xs text-zinc-400">{new Date(session.createdAt).toLocaleDateString('es-CO')}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
