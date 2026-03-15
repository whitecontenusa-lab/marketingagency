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
  cycleId: string | null
}

const PLATFORM_COLORS: Record<string, string> = {
  instagram: 'bg-pink-100 text-pink-700',
  tiktok: 'bg-zinc-900 text-white',
  facebook: 'bg-blue-100 text-blue-700',
  linkedin: 'bg-sky-100 text-sky-700',
  email: 'bg-amber-100 text-amber-700',
  blog: 'bg-green-100 text-green-700',
}

const strings = {
  es: {
    title: 'Contenido del Mes',
    request: 'Solicitar contenido del mes',
    requesting: 'Solicitando...',
    paymentPending: 'Tu solicitud está siendo procesada. El equipo verificará el pago pronto.',
    approved: 'Ciclo aprobado — el equipo está preparando tus 30 piezas.',
    generating: 'Generando con IA...',
    delivered: (n: number) => `Ciclo #${n} — 30 piezas listas`,
    cycleLabel: (n: number) => `Ciclo #${n}`,
    pieces: 'piezas',
    availableOn: (d: string) => `Disponible el ${d}`,
    verMas: 'ver más',
    verMenos: 'ver menos',
    platforms: 'Por plataforma',
    noCycles: 'No hay ciclos de contenido aún.',
    error: 'Error al procesar la solicitud. Intenta de nuevo.',
  },
  en: {
    title: 'Monthly Content',
    request: 'Request monthly content',
    requesting: 'Requesting...',
    paymentPending: 'Your request is being processed. The team will verify your payment shortly.',
    approved: 'Cycle approved — the team is preparing your 30 pieces.',
    generating: 'Generating with AI...',
    delivered: (n: number) => `Cycle #${n} — 30 pieces ready`,
    cycleLabel: (n: number) => `Cycle #${n}`,
    pieces: 'pieces',
    availableOn: (d: string) => `Available on ${d}`,
    verMas: 'show more',
    verMenos: 'show less',
    platforms: 'By platform',
    noCycles: 'No content cycles yet.',
    error: 'Error processing request. Please try again.',
  },
}

function PieceCard({ piece, lang }: { piece: ContentPiece; lang: 'es' | 'en' }) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const s = strings[lang]
  const now = new Date()
  const releasedAt = piece.releasedAt ? new Date(piece.releasedAt) : null
  const isLocked = releasedAt !== null && releasedAt > now

  const platformColor = PLATFORM_COLORS[piece.platform] ?? 'bg-zinc-100 text-zinc-700'

  async function copyPiece() {
    const parts = [piece.hook, '', piece.body]
    if (piece.cta) parts.push('', piece.cta)
    if (piece.hashtags) parts.push('', piece.hashtags)
    try {
      await navigator.clipboard.writeText(parts.join('\n'))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard not available (http or permissions)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-zinc-100 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${platformColor}`}>
          {piece.platform}
        </span>
        <span className="text-xs text-zinc-400 bg-zinc-50 px-2 py-0.5 rounded-full">
          {piece.format}
        </span>
        {!isLocked && (
          <button
            onClick={copyPiece}
            className="ml-auto text-xs text-zinc-400 hover:text-zinc-700 transition flex items-center gap-1"
            title={lang === 'es' ? 'Copiar pieza' : 'Copy piece'}
          >
            {copied
              ? <span className="text-green-600 font-medium">{lang === 'es' ? '✓ Copiado' : '✓ Copied'}</span>
              : <span>{lang === 'es' ? 'Copiar' : 'Copy'}</span>
            }
          </button>
        )}
      </div>

      {isLocked ? (
        <p className="text-sm text-zinc-400 italic">
          {s.availableOn(releasedAt!.toLocaleDateString(lang === 'en' ? 'en-US' : 'es-CO', { year: 'numeric', month: 'long', day: 'numeric' }))}
        </p>
      ) : (
        <>
          <p className="text-sm font-semibold text-zinc-900 leading-snug mb-2">{piece.hook}</p>
          <div>
            <p className={`text-sm text-zinc-600 leading-relaxed ${expanded ? '' : 'line-clamp-3'}`}>
              {piece.body}
            </p>
            {piece.body && piece.body.length > 120 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-zinc-400 hover:text-zinc-700 mt-1 transition"
              >
                {expanded ? s.verMenos : s.verMas}
              </button>
            )}
          </div>
          {piece.cta && (
            <p className="text-xs text-zinc-500 italic mt-2 border-l-2 border-zinc-200 pl-2">{piece.cta}</p>
          )}
          {piece.hashtags && (
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">{piece.hashtags}</p>
          )}
        </>
      )}
    </div>
  )
}

function PieceGrid({ cycleId, sessionId, lang }: { cycleId: string; sessionId: string; lang: 'es' | 'en' }) {
  const [pieces, setPieces] = useState<ContentPiece[]>([])
  const [loading, setLoading] = useState(true)
  const [activePlatform, setActivePlatform] = useState<string>('all')
  const s = strings[lang]

  useEffect(() => {
    fetch(`/api/sessions/${sessionId}/content?cycleId=${cycleId}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { setPieces(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [cycleId, sessionId])

  if (loading) return (
    <div className="flex justify-center py-8">
      <div className="w-6 h-6 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
    </div>
  )

  const platforms = ['all', ...Array.from(new Set(pieces.map(p => p.platform)))]
  const filtered = activePlatform === 'all' ? pieces : pieces.filter(p => p.platform === activePlatform)

  function downloadAll() {
    const available = pieces.filter(p => {
      const rel = p.releasedAt ? new Date(p.releasedAt) : null
      return !rel || rel <= new Date()
    })
    const text = available.map((p, i) => {
      const lines = [
        `=== ${lang === 'es' ? 'Pieza' : 'Piece'} ${i + 1} — ${p.platform.toUpperCase()} (${p.format}) ===`,
        '',
        p.hook,
        '',
        p.body,
      ]
      if (p.cta) lines.push('', `➜ ${p.cta}`)
      if (p.hashtags) lines.push('', p.hashtags)
      return lines.join('\n')
    }).join('\n\n---\n\n')

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = lang === 'es' ? `contenido-ciclo.txt` : `content-cycle.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      {pieces.length > 0 && (
        <div className="flex justify-end mb-3">
          <button
            onClick={downloadAll}
            className="text-xs border border-zinc-200 text-zinc-600 hover:bg-zinc-50 px-4 py-2 rounded-lg transition flex items-center gap-1.5 font-medium"
          >
            ↓ {lang === 'es' ? 'Descargar todo (.txt)' : 'Download all (.txt)'}
          </button>
        </div>
      )}
      {/* Platform filter tabs */}
      <div className="flex gap-1 flex-wrap mb-4">
        {platforms.map(pl => (
          <button
            key={pl}
            onClick={() => setActivePlatform(pl)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition ${
              activePlatform === pl
                ? 'bg-zinc-900 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            {pl === 'all' ? (lang === 'es' ? 'Todas' : 'All') : pl} {pl === 'all' ? `(${pieces.length})` : `(${pieces.filter(p => p.platform === pl).length})`}
          </button>
        ))}
      </div>

      <p className="text-xs text-zinc-400 mb-4">{s.platforms}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map(piece => (
          <PieceCard key={piece.id} piece={piece} lang={lang} />
        ))}
      </div>
    </div>
  )
}

export default function TabContenidoCiclo({ sessionId, lang }: { sessionId: string; lang: 'es' | 'en' }) {
  const [cycles, setCycles] = useState<ContentCycle[]>([])
  const [loading, setLoading] = useState(true)
  const [requesting, setRequesting] = useState(false)
  const [error, setError] = useState('')
  const s = strings[lang]

  const fetchCycles = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/content-cycle`)
      if (res.ok) setCycles(await res.json())
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => { fetchCycles() }, [fetchCycles])

  // Poll every 5s while a cycle is generating
  useEffect(() => {
    const generating = cycles.some(c => c.status === 'generating')
    if (!generating) return
    const interval = setInterval(fetchCycles, 5000)
    return () => clearInterval(interval)
  }, [cycles, fetchCycles])

  async function requestCycle() {
    setRequesting(true)
    setError('')
    try {
      const res = await fetch(`/api/sessions/${sessionId}/content-cycle/request`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        if (res.status === 409) {
          // Cycle already active, refetch to show current state
          await fetchCycles()
          return
        }
        throw new Error(data.error ?? 'Error')
      }
      await fetchCycles()
    } catch (e) {
      setError(s.error)
      console.error(e)
    } finally {
      setRequesting(false)
    }
  }

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
    </div>
  )

  // Get the most recent non-delivered cycle, or latest cycle overall
  const activeCycle = cycles.find(c => c.status !== 'delivered') ?? cycles[0] ?? null

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>
      )}

      {/* No cycles at all */}
      {cycles.length === 0 && (
        <div className="bg-white rounded-2xl border border-zinc-100 p-10 text-center">
          <div className="w-16 h-16 bg-zinc-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">📅</div>
          <h3 className="text-lg font-bold text-zinc-900 mb-2">{s.title}</h3>
          <p className="text-zinc-500 text-sm mb-6 max-w-sm mx-auto">{s.noCycles}</p>
          <button
            onClick={requestCycle}
            disabled={requesting}
            className="bg-zinc-900 text-white px-8 py-3 rounded-xl font-semibold hover:bg-zinc-700 transition disabled:opacity-50 flex items-center gap-2 mx-auto"
          >
            {requesting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {s.requesting}
              </>
            ) : `📅 ${s.request}`}
          </button>
        </div>
      )}

      {/* Active cycle status */}
      {activeCycle && activeCycle.status === 'payment_pending' && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⏳</span>
            <div>
              <p className="font-semibold text-amber-800 mb-1">{s.cycleLabel(activeCycle.cycleNumber)}</p>
              <p className="text-sm text-amber-700">{s.paymentPending}</p>
            </div>
          </div>
        </div>
      )}

      {activeCycle && activeCycle.status === 'approved' && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <p className="font-semibold text-blue-800 mb-1">{s.cycleLabel(activeCycle.cycleNumber)}</p>
              <p className="text-sm text-blue-700">{s.approved}</p>
            </div>
          </div>
        </div>
      )}

      {activeCycle && activeCycle.status === 'generating' && (
        <div className="bg-purple-50 border border-purple-100 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-purple-300 border-t-purple-700 rounded-full animate-spin flex-shrink-0" />
            <div>
              <p className="font-semibold text-purple-800">{s.cycleLabel(activeCycle.cycleNumber)}</p>
              <p className="text-sm text-purple-600">{s.generating}</p>
            </div>
          </div>
        </div>
      )}

      {/* Delivered cycles — show pieces for the most recent delivered */}
      {cycles.filter(c => c.status === 'delivered').length > 0 && (
        <>
          {cycles.filter(c => c.status === 'delivered').map((cycle, idx) => (
            <div key={cycle.id}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-zinc-900">{s.delivered(cycle.cycleNumber)}</h3>
                  {cycle.deliveryDate && (
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {new Date(cycle.deliveryDate).toLocaleDateString(lang === 'en' ? 'en-US' : 'es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  )}
                </div>
                <span className="text-xs bg-green-50 text-green-700 font-medium px-3 py-1 rounded-full">
                  {cycle._count.contentPieces} {s.pieces}
                </span>
              </div>
              {/* Only expand pieces for the first (most recent) delivered cycle */}
              {idx === 0 && <PieceGrid cycleId={cycle.id} sessionId={sessionId} lang={lang} />}
            </div>
          ))}
        </>
      )}

      {/* Show request button again if last cycle was delivered */}
      {cycles.length > 0 && !activeCycle && (
        <div className="text-center pt-2">
          <button
            onClick={requestCycle}
            disabled={requesting}
            className="bg-zinc-900 text-white px-8 py-3 rounded-xl font-semibold hover:bg-zinc-700 transition disabled:opacity-50 flex items-center gap-2 mx-auto"
          >
            {requesting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {s.requesting}
              </>
            ) : `📅 ${s.request}`}
          </button>
        </div>
      )}
    </div>
  )
}
