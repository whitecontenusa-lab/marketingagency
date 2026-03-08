'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { marked } from 'marked'

const FUNNEL_NAMES: Record<number, string> = {
  1: 'Conciencia y Confianza',
  2: 'Autoridad y Conversión',
  3: 'Premium y Relación',
  4: 'Escala y Automatización',
}

type DocKey = 'perfil' | 'funnel' | 'contenido' | 'itr' | 'roadmap'

interface Strategy {
  funnelType: number
  emotionalArchetype: string
  funnelReason: string
  simulationNotes: string
  documents: {
    perfil?: string
    funnel?: string
    contenido?: string
    itr?: string
    roadmap?: string
  }
}

interface Props {
  sessionId: string
  clientName: string
  brandName: string
  approvedAt: string | null
  strategy: Record<string, unknown> | null
}

export default function ClientPortalView({ sessionId, clientName, brandName, approvedAt, strategy: rawStrategy }: Props) {
  const router = useRouter()
  const [activeDoc, setActiveDoc] = useState<DocKey>('perfil')
  const [loggingOut, setLoggingOut] = useState(false)

  const strategy = rawStrategy as Strategy | null

  async function handleLogout() {
    setLoggingOut(true)
    await fetch('/api/client/auth/logout', { method: 'POST' })
    router.push('/cliente/login')
  }

  const displayName = brandName || clientName

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Minimal nav */}
      <nav className="bg-white border-b border-zinc-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <span className="font-semibold text-zinc-900">{displayName}</span>
          {brandName && clientName && brandName !== clientName && (
            <span className="text-zinc-400 text-sm ml-2">{clientName}</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {approvedAt && (
            <span className="text-xs bg-green-50 text-green-700 font-medium px-3 py-1 rounded-full">
              Estrategia aprobada
            </span>
          )}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="text-sm text-zinc-400 hover:text-zinc-900 transition disabled:opacity-50"
          >
            {loggingOut ? 'Saliendo...' : 'Cerrar sesión'}
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {!strategy ? (
          <div className="bg-white rounded-2xl border border-zinc-100 p-10 text-center">
            <div className="w-16 h-16 bg-zinc-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">⏳</div>
            <h3 className="text-xl font-bold text-zinc-900 mb-2">Estrategia en preparación</h3>
            <p className="text-zinc-500 text-sm max-w-md mx-auto">
              Tu estrategia está siendo revisada por el equipo de Avilion. Te notificaremos cuando esté lista.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Strategy header */}
            <div className="bg-zinc-900 text-white rounded-2xl p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-1">Tu estrategia de marca</p>
                  <h3 className="text-xl font-bold">
                    Funnel {strategy.funnelType} — {FUNNEL_NAMES[strategy.funnelType] ?? ''}
                  </h3>
                </div>
                <span className="text-xs bg-white/10 px-3 py-1.5 rounded-full font-medium flex-shrink-0 ml-4">
                  {strategy.emotionalArchetype}
                </span>
              </div>
              <p className="text-zinc-300 text-sm leading-relaxed">{strategy.funnelReason}</p>
              {approvedAt && (
                <p className="text-xs text-zinc-500 mt-3">
                  Aprobada el {new Date(approvedAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              )}
            </div>

            {/* Document tabs */}
            <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
              <div className="flex border-b border-zinc-100 overflow-x-auto">
                {(['perfil', 'funnel', 'contenido', 'itr', 'roadmap'] as DocKey[]).map(doc => {
                  if (doc === 'roadmap' && !strategy.documents?.roadmap) return null
                  return (
                    <button
                      key={doc}
                      onClick={() => setActiveDoc(doc)}
                      className={`flex-1 py-3 px-4 text-sm font-medium transition whitespace-nowrap ${
                        activeDoc === doc
                          ? 'bg-zinc-900 text-white'
                          : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
                      }`}
                    >
                      {doc === 'perfil' ? 'Perfil de Marca' :
                       doc === 'funnel' ? 'Funnel' :
                       doc === 'contenido' ? 'Contenido' :
                       doc === 'itr' ? 'ITR' : 'Plan 90 Días'}
                    </button>
                  )
                })}
              </div>
              <div className="p-6">
                <div
                  className="prose prose-zinc prose-sm max-w-none overflow-auto max-h-[600px] [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-zinc-900 [&_h1]:mb-4 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-zinc-800 [&_h2]:mt-6 [&_h2]:mb-3 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-zinc-700 [&_h3]:mt-4 [&_h3]:mb-2 [&_li]:text-sm [&_li]:text-zinc-700 [&_p]:text-sm [&_p]:text-zinc-700 [&_p]:leading-relaxed [&_strong]:font-semibold [&_strong]:text-zinc-900 [&_ul]:space-y-1 [&_ol]:space-y-1"
                  dangerouslySetInnerHTML={{ __html: marked(strategy.documents?.[activeDoc] ?? '') as string }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
