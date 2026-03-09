'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { marked } from 'marked'
import TabChecklist from './TabChecklist'
import TabPropuestaFactura from './TabPropuestaFactura'
import TabCampanas from './TabCampanas'
import TabInteligencia from './TabInteligencia'

interface Strategy {
  lang: string
  funnelType: number
  funnelReason: string
  emotionalArchetype: string
  emotionalArchetypeReason: string
  simulationNotes: string
  documents: {
    perfil: string
    funnel: string
    contenido: string
    itr: string
    roadmap?: string
  }
}

interface Blueprint {
  id: string
  contentMd: string
  agencyApprovedAt: string | null
  createdAt: string
}

const FUNNEL_NAMES: Record<number, string> = {
  1: 'Conciencia y Confianza',
  2: 'Autoridad y Conversión',
  3: 'Premium y Relación',
  4: 'Escala y Automatización',
}

export default function ClientePage() {
  const { id } = useParams<{ id: string }>()
  const [session, setSession] = useState<Record<string, unknown> | null>(null)
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null)
  const [strategy, setStrategy] = useState<Strategy | null>(null)
  const [activeTab, setActiveTab] = useState<'estrategia' | 'checklist' | 'propuesta' | 'campanas' | 'inteligencia'>('estrategia')
  const [activeDoc, setActiveDoc] = useState<'perfil' | 'funnel' | 'contenido' | 'itr' | 'roadmap'>('perfil')
  const [analyzing, setAnalyzing] = useState(false)
  const [generating, setGenerating] = useState(false) // runner is working
  const [approving, setApproving] = useState(false)
  const [error, setError] = useState('')
  const [approveResult, setApproveResult] = useState('')
  const [clientCredentials, setClientCredentials] = useState<{ email: string; password: string } | null>(null)
  const [loadError, setLoadError] = useState('')

  const loadData = useCallback(async () => {
    try {
      const [sessionRes, blueprintRes] = await Promise.all([
        fetch(`/api/clients/${id}/profile`),
        fetch(`/api/sessions/${id}/blueprint`),
      ])
      if (!sessionRes.ok) throw new Error('Session not found')
      setSession(await sessionRes.json())

      if (blueprintRes.status === 202) {
        // Runner is still generating — keep polling
        setGenerating(true)
        return
      }
      if (blueprintRes.ok) {
        const bp: Blueprint = await blueprintRes.json()
        setBlueprint(bp)
        setGenerating(false)
        try { setStrategy(JSON.parse(bp.contentMd)) } catch { /* ignore */ }
      }
    } catch {
      setLoadError('No se pudo cargar el cliente.')
    }
  }, [id])

  // Auto-poll every 5s while the runner is generating
  useEffect(() => { loadData() }, [loadData])
  useEffect(() => {
    if (!generating) return
    const interval = setInterval(loadData, 5000)
    return () => clearInterval(interval)
  }, [generating, loadData])

  async function analyze() {
    setAnalyzing(true)
    setError('')
    try {
      const res = await fetch(`/api/sessions/${id}/analyze`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      if (data.generating) {
        // GitHub Actions runner picked it up — poll for result
        setGenerating(true)
      } else {
        await loadData()
      }
    } catch {
      setError('Error al generar la estrategia. Intenta de nuevo.')
    } finally {
      setAnalyzing(false)
    }
  }

  async function approve() {
    setApproving(true)
    setError('')
    try {
      const res = await fetch(`/api/sessions/${id}/approve`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setApproveResult(`Aprobado y publicado en Gitea → /clientes/${data.folder}`)
      if (data.tempPassword && data.clientEmail) {
        setClientCredentials({ email: data.clientEmail, password: data.tempPassword })
      }
      await loadData()
    } catch {
      setError('Error al aprobar. Intenta de nuevo.')
    } finally {
      setApproving(false)
    }
  }

  if (loadError) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <p className="text-red-600 text-sm">{loadError}</p>
    </div>
  )

  if (!session) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
    </div>
  )

  const isApproved = !!blueprint?.agencyApprovedAt
  const clientName = String(session.clientName ?? '')
  const brandName = String(session.brandName ?? '')

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Nav */}
      <nav className="bg-white border-b border-zinc-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-zinc-900">← Panel</Link>
          <div>
            <span className="font-semibold text-zinc-900">{brandName || clientName}</span>
            {brandName && <span className="text-zinc-400 text-sm ml-2">{clientName}</span>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1.5 ${
            isApproved ? 'bg-green-50 text-green-700' :
            strategy ? 'bg-blue-50 text-blue-700' :
            generating ? 'bg-purple-50 text-purple-700' :
            'bg-yellow-50 text-yellow-700'
          }`}>
            {generating && <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />}
            {isApproved ? 'Aprobado' : strategy ? 'En revisión' : generating ? 'Generando con Claude...' : 'Pendiente análisis'}
          </span>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Client summary card */}
        <div className="bg-white rounded-2xl border border-zinc-100 p-6 mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-4">Datos del cliente</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span className="text-zinc-400 block text-xs mb-0.5">País</span><span className="font-medium">{String(session.country || '—')}</span></div>
            <div><span className="text-zinc-400 block text-xs mb-0.5">Industria</span><span className="font-medium">{String(session.industry || '—')}</span></div>
            <div><span className="text-zinc-400 block text-xs mb-0.5">Etapa</span><span className="font-medium capitalize">{String(session.businessStage || '—')}</span></div>
            <div><span className="text-zinc-400 block text-xs mb-0.5">Precio</span><span className="font-medium">${String(session.productPrice || '0')} USD</span></div>
            <div className="col-span-2"><span className="text-zinc-400 block text-xs mb-0.5">Producto</span><span className="font-medium">{String(session.productDescription || '—')}</span></div>
            <div className="col-span-2"><span className="text-zinc-400 block text-xs mb-0.5">Propósito</span><span className="font-medium">{String(session.purpose || '—')}</span></div>
            <div className="col-span-2"><span className="text-zinc-400 block text-xs mb-0.5">Dolor del ICP</span><span className="font-medium">{String(session.icpPain || '—')}</span></div>
            <div className="col-span-2"><span className="text-zinc-400 block text-xs mb-0.5">Deseo del ICP</span><span className="font-medium">{String(session.icpDesire || '—')}</span></div>
          </div>
        </div>

        {/* Main section tabs */}
        <div className="flex border-b border-zinc-200 mb-6 bg-white rounded-t-xl overflow-hidden">
          {([
            { key: 'estrategia', label: 'Estrategia' },
            { key: 'checklist', label: 'Checklist' },
            { key: 'propuesta', label: 'Propuesta & Factura' },
            { key: 'campanas', label: 'Campañas' },
            { key: 'inteligencia', label: 'Inteligencia' },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-3 text-sm font-medium transition border-b-2 ${
                activeTab === tab.key
                  ? 'border-zinc-900 text-zinc-900'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && <div className="mb-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg px-4 py-3">{error}</div>}
        {approveResult && <div className="mb-4 bg-green-50 border border-green-100 text-green-700 text-sm rounded-lg px-4 py-3">{approveResult}</div>}

        {/* CHECKLIST TAB */}
        {activeTab === 'checklist' && <TabChecklist sessionId={id} />}

        {/* PROPUESTA & FACTURA TAB */}
        {activeTab === 'propuesta' && <TabPropuestaFactura sessionId={id} />}

        {/* CAMPAÑAS TAB */}
        {activeTab === 'campanas' && <TabCampanas sessionId={id} />}

        {/* INTELIGENCIA TAB */}
        {activeTab === 'inteligencia' && <TabInteligencia sessionId={id} />}

        {/* ESTRATEGIA TAB */}
        {activeTab === 'estrategia' && (
          <>
            {/* NO STRATEGY YET */}
            {!strategy && (
              <div className="bg-white rounded-2xl border border-zinc-100 p-10 text-center">
                <div className="w-16 h-16 bg-zinc-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">🧠</div>
                <h3 className="text-xl font-bold text-zinc-900 mb-2">Estrategia no generada</h3>
                <p className="text-zinc-500 text-sm mb-6 max-w-md mx-auto">
                  El cliente completó su entrevista. El motor de IA va a analizar sus respuestas y generar la estrategia completa: funnel, perfil profundo, contenido madre e ITR.
                </p>
                <button
                  onClick={analyze}
                  disabled={analyzing}
                  className="bg-zinc-900 text-white px-8 py-3 rounded-xl font-semibold hover:bg-zinc-700 transition disabled:opacity-50 flex items-center gap-2 mx-auto"
                >
                  {analyzing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Analizando con IA...
                    </>
                  ) : '⚡ Generar Estrategia con IA'}
                </button>
                {analyzing && (
                  <p className="text-xs text-zinc-400 mt-3">Esto toma 10-20 segundos. El ecosistema está procesando...</p>
                )}
              </div>
            )}

            {/* STRATEGY READY */}
            {strategy && (
              <div className="space-y-6">
                {/* Strategy header */}
                <div className="bg-zinc-900 text-white rounded-2xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-1">Estrategia generada por IA</p>
                      <h3 className="text-xl font-bold">
                        Funnel {strategy.funnelType} — {FUNNEL_NAMES[strategy.funnelType] ?? ''}
                      </h3>
                    </div>
                    <span className="text-xs bg-white/10 px-3 py-1.5 rounded-full font-medium">
                      {strategy.emotionalArchetype}
                    </span>
                  </div>
                  <p className="text-zinc-300 text-sm leading-relaxed mb-4">{strategy.funnelReason}</p>
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-2">Simulación de mercado</p>
                    <div
                      className="[&_p]:text-zinc-300 [&_p]:text-sm [&_p]:leading-relaxed [&_p]:mb-3 [&_strong]:text-white [&_strong]:font-semibold"
                      dangerouslySetInnerHTML={{ __html: marked(strategy.simulationNotes) as string }}
                    />
                  </div>
                </div>

                {/* Document tabs */}
                <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
                  <div className="flex border-b border-zinc-100">
                    {(['perfil', 'funnel', 'contenido', 'itr', 'roadmap'] as const).map(doc => {
                      if (doc === 'roadmap' && !strategy.documents.roadmap) return null
                      return (
                        <button
                          key={doc}
                          onClick={() => setActiveDoc(doc)}
                          className={`flex-1 py-3 text-sm font-medium transition ${
                            activeDoc === doc
                              ? 'bg-zinc-900 text-white'
                              : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
                          }`}
                        >
                          {doc === 'perfil' ? 'Perfil' :
                           doc === 'funnel' ? 'Funnel' :
                           doc === 'contenido' ? 'Contenido' :
                           doc === 'itr' ? 'ITR' : '90 Días'}
                        </button>
                      )
                    })}
                  </div>
                  <div className="p-6">
                    <div
                      className="prose prose-zinc prose-sm max-w-none overflow-auto max-h-[600px] [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-zinc-900 [&_h1]:mb-4 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-zinc-800 [&_h2]:mt-6 [&_h2]:mb-3 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-zinc-700 [&_h3]:mt-4 [&_h3]:mb-2 [&_li]:text-sm [&_li]:text-zinc-700 [&_p]:text-sm [&_p]:text-zinc-700 [&_p]:leading-relaxed [&_strong]:font-semibold [&_strong]:text-zinc-900 [&_ul]:space-y-1 [&_ol]:space-y-1"
                      dangerouslySetInnerHTML={{ __html: marked(strategy.documents[activeDoc] ?? '') as string }}
                    />
                  </div>
                </div>

                {/* Approve section */}
                {!isApproved ? (
                  <div className="bg-white rounded-2xl border border-zinc-100 p-6 flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-zinc-900 mb-1">¿La estrategia es correcta?</h4>
                      <p className="text-sm text-zinc-500">Al aprobar, los archivos se publican en Gitea y el ecosistema se activa para este cliente.</p>
                    </div>
                    <div className="flex gap-3 flex-shrink-0 ml-6">
                      <button
                        onClick={analyze}
                        disabled={analyzing || approving}
                        className="border border-zinc-200 text-zinc-700 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-zinc-50 transition disabled:opacity-50"
                      >
                        {analyzing ? 'Regenerando...' : '↺ Regenerar'}
                      </button>
                      <button
                        onClick={approve}
                        disabled={approving || analyzing}
                        className="bg-zinc-900 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-zinc-700 transition disabled:opacity-50"
                      >
                        {approving ? 'Publicando...' : '✓ Aprobar y Publicar'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-100 rounded-2xl p-6">
                      <p className="font-semibold text-green-800 mb-1">✓ Estrategia aprobada y publicada</p>
                      <p className="text-sm text-green-700">Los archivos están en Gitea. El ecosistema está activo para este cliente.</p>
                      <p className="text-xs text-green-600 mt-2">Aprobado: {blueprint?.agencyApprovedAt ? new Date(blueprint.agencyApprovedAt).toLocaleString('es-CO') : ''}</p>
                    </div>
                    {clientCredentials && (
                      <ClientCredentialsCard
                        email={clientCredentials.email}
                        password={clientCredentials.password}
                        sessionId={id}
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function ClientCredentialsCard({ email, password, sessionId }: { email: string; password: string; sessionId: string }) {
  const [copied, setCopied] = useState(false)
  const loginUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/cliente/login`

  function copyAll() {
    const text = `URL: ${loginUrl}\nEmail: ${email}\nContraseña: ${password}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-blue-900 text-sm">Acceso del cliente</h4>
        <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">Solo visible ahora</span>
      </div>
      <div className="space-y-2 text-sm mb-4">
        <div className="flex gap-2">
          <span className="text-blue-600 w-24 flex-shrink-0">URL:</span>
          <span className="font-mono text-blue-900">{loginUrl}</span>
        </div>
        <div className="flex gap-2">
          <span className="text-blue-600 w-24 flex-shrink-0">Email:</span>
          <span className="font-mono text-blue-900">{email}</span>
        </div>
        <div className="flex gap-2">
          <span className="text-blue-600 w-24 flex-shrink-0">Contraseña:</span>
          <span className="font-mono text-blue-900 font-semibold">{password}</span>
        </div>
      </div>
      <button
        onClick={copyAll}
        className="text-xs bg-blue-900 text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition font-medium"
      >
        {copied ? '✓ Copiado' : 'Copiar credenciales'}
      </button>
      <p className="text-xs text-blue-500 mt-2">Comparte estas credenciales con el cliente. La contraseña no se puede recuperar luego.</p>
    </div>
  )
}
