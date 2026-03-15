'use client'
import { useEffect, useState, useCallback } from 'react'

interface ContentCycle {
  id: string
  cycleNumber: number
  status: string
  billingOk: boolean
  adminApprovedAt: string | null
  generatedAt: string | null
  deliveryDate: string | null
  createdAt: string
  _count: { contentPieces: number }
}

interface ContentPiece {
  id: string
  platform: string
  format: string
  hook: string
  body: string
  cta: string
  hashtags: string
  status: string
  releasedAt: string | null
}

const STATUS_STYLES: Record<string, string> = {
  locked: 'bg-zinc-100 text-zinc-500',
  payment_pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-blue-50 text-blue-700',
  generating: 'bg-purple-50 text-purple-700',
  delivered: 'bg-green-50 text-green-700',
  error: 'bg-red-50 text-red-700',
}

const STATUS_LABELS: Record<string, string> = {
  locked: 'Bloqueado',
  payment_pending: 'Pago pendiente',
  approved: 'Aprobado',
  generating: 'Generando...',
  delivered: 'Entregado',
  error: 'Error — reintenta',
}

export default function TabCicloContenido({ sessionId }: { sessionId: string }) {
  const [cycles, setCycles] = useState<ContentCycle[]>([])
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState<string | null>(null)
  const [generating, setGenerating] = useState<string | null>(null)
  const [expandedCycle, setExpandedCycle] = useState<string | null>(null)
  const [pieces, setPieces] = useState<Record<string, ContentPiece[]>>({})
  const [piecesLoading, setPiecesLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  const fetchCycles = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/content-cycle`)
      if (res.ok) {
        const data = await res.json()
        setCycles(data)
      }
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => { fetchCycles() }, [fetchCycles])

  // Poll every 5s while any cycle is generating
  useEffect(() => {
    const hasGenerating = cycles.some(c => c.status === 'generating')
    if (!hasGenerating) return
    const interval = setInterval(fetchCycles, 5000)
    return () => clearInterval(interval)
  }, [cycles, fetchCycles])

  async function approveCycle(cycleId: string) {
    setApproving(cycleId)
    setError('')
    try {
      const res = await fetch(`/api/sessions/${sessionId}/content-cycle/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cycleId }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Error')
      }
      await fetchCycles()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al aprobar')
    } finally {
      setApproving(null)
    }
  }

  async function generateCycle(cycleId: string) {
    setGenerating(cycleId)
    setError('')
    try {
      const res = await fetch(`/api/sessions/${sessionId}/content-cycle/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cycleId }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Error')
      }
      await fetchCycles()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al generar')
    } finally {
      setGenerating(null)
    }
  }

  async function loadPieces(cycleId: string) {
    if (pieces[cycleId]) {
      setExpandedCycle(expandedCycle === cycleId ? null : cycleId)
      return
    }
    setPiecesLoading(cycleId)
    setExpandedCycle(cycleId)
    try {
      const res = await fetch(`/api/sessions/${sessionId}/content?cycleId=${cycleId}`)
      if (res.ok) {
        const data = await res.json()
        setPieces(prev => ({ ...prev, [cycleId]: data }))
      }
    } finally {
      setPiecesLoading(null)
    }
  }

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>
      )}

      {cycles.length === 0 && (
        <div className="bg-white rounded-xl border border-zinc-100 p-10 text-center">
          <p className="text-2xl mb-3">📅</p>
          <p className="text-sm font-semibold text-zinc-900 mb-1">Sin ciclos de contenido</p>
          <p className="text-xs text-zinc-400">El cliente no ha solicitado ningún ciclo todavía.</p>
        </div>
      )}

      {cycles.map(cycle => (
        <div key={cycle.id} className="bg-white rounded-xl border border-zinc-100 overflow-hidden">
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">Ciclo #{cycle.cycleNumber}</p>
                  {cycle.deliveryDate && (
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Entrega: {new Date(cycle.deliveryDate).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5 ${STATUS_STYLES[cycle.status] ?? 'bg-zinc-100 text-zinc-500'}`}>
                  {cycle.status === 'generating' && (
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                  )}
                  {STATUS_LABELS[cycle.status] ?? cycle.status}
                </span>
                {cycle.status === 'delivered' && (
                  <span className="text-xs text-zinc-400">{cycle._count.contentPieces} piezas</span>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 flex-wrap">
              {cycle.status === 'payment_pending' && (
                <button
                  onClick={() => approveCycle(cycle.id)}
                  disabled={approving === cycle.id}
                  className="text-xs bg-zinc-900 text-white px-4 py-2 rounded-lg hover:bg-zinc-700 transition disabled:opacity-50 flex items-center gap-1.5 font-medium"
                >
                  {approving === cycle.id ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Aprobando...
                    </>
                  ) : '✓ Aprobar ciclo'}
                </button>
              )}

              {(cycle.status === 'approved' || cycle.status === 'error') && (
                <button
                  onClick={() => generateCycle(cycle.id)}
                  disabled={generating === cycle.id}
                  className="text-xs bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition disabled:opacity-50 flex items-center gap-1.5 font-medium"
                >
                  {generating === cycle.id ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Generando...
                    </>
                  ) : cycle.status === 'error' ? '↺ Reintentar generación' : '✨ Generar 30 piezas'}
                </button>
              )}

              {cycle.status === 'generating' && (
                <div className="flex items-center gap-2 text-xs text-purple-600 font-medium">
                  <div className="w-3 h-3 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
                  Claude está generando el contenido... (puede tardar ~5 min)
                </div>
              )}

              {cycle.status === 'delivered' && cycle._count.contentPieces > 0 && (
                <button
                  onClick={() => loadPieces(cycle.id)}
                  className="text-xs border border-zinc-200 text-zinc-700 px-4 py-2 rounded-lg hover:bg-zinc-50 transition font-medium"
                >
                  {expandedCycle === cycle.id ? '↑ Ocultar piezas' : `↓ Ver ${cycle._count.contentPieces} piezas`}
                </button>
              )}
            </div>

            {/* Metadata */}
            <div className="mt-3 flex gap-4 text-xs text-zinc-400">
              {cycle.adminApprovedAt && (
                <span>Aprobado: {new Date(cycle.adminApprovedAt).toLocaleString('es-CO')}</span>
              )}
              {cycle.generatedAt && (
                <span>Generado: {new Date(cycle.generatedAt).toLocaleString('es-CO')}</span>
              )}
            </div>
          </div>

          {/* Pieces list */}
          {expandedCycle === cycle.id && (
            <div className="border-t border-zinc-100 p-5">
              {piecesLoading === cycle.id ? (
                <div className="flex justify-center py-4">
                  <div className="w-5 h-5 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
                    Piezas generadas — {(pieces[cycle.id] ?? []).length} total
                  </p>
                  {(pieces[cycle.id] ?? []).map((piece, i) => (
                    <div key={piece.id} className="border border-zinc-100 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs bg-zinc-900 text-white px-2 py-0.5 rounded-full font-medium">
                          #{i + 1}
                        </span>
                        <span className="text-xs text-zinc-500 bg-zinc-50 px-2 py-0.5 rounded-full">
                          {piece.platform}
                        </span>
                        <span className="text-xs text-zinc-400">{piece.format}</span>
                        {piece.releasedAt && (
                          <span className="text-xs text-zinc-400 ml-auto">
                            {new Date(piece.releasedAt) > new Date()
                              ? `Disponible: ${new Date(piece.releasedAt).toLocaleDateString('es-CO')}`
                              : 'Visible'}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-zinc-900 mb-1">{piece.hook}</p>
                      <p className="text-xs text-zinc-500 line-clamp-2">{piece.body}</p>
                      {piece.hashtags && (
                        <p className="text-xs text-zinc-400 mt-1">{piece.hashtags}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
