'use client'
import { useEffect, useState } from 'react'

interface Campaign {
  id: string; name: string; objective: string; status: string
  channels: string; startDate: string | null; endDate: string | null
  pieces: { id: string; status: string }[]
}

interface ContentPiece {
  id: string; platform: string; format: string; hook: string
  body: string; cta: string; hashtags: string; status: string
  scheduledAt: string | null; aiGenerated: boolean; campaignId: string | null
}

const PLATFORMS = ['instagram', 'tiktok', 'facebook', 'linkedin', 'email', 'blog']
const PLATFORM_ICONS: Record<string, string> = {
  instagram: 'IG', tiktok: 'TK', facebook: 'FB',
  linkedin: 'LN', email: '✉', blog: '📝',
}
const PLATFORM_COLORS: Record<string, string> = {
  instagram: 'bg-pink-50 text-pink-700',
  tiktok: 'bg-zinc-900 text-white',
  facebook: 'bg-blue-50 text-blue-700',
  linkedin: 'bg-blue-100 text-blue-800',
  email: 'bg-amber-50 text-amber-700',
  blog: 'bg-green-50 text-green-700',
}
const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-zinc-100 text-zinc-500',
  ready: 'bg-blue-50 text-blue-700',
  scheduled: 'bg-purple-50 text-purple-700',
  published: 'bg-green-50 text-green-700',
}
const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador', ready: 'Listo', scheduled: 'Programado', published: 'Publicado',
}

export default function TabCampanas({ sessionId }: { sessionId: string }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [pieces, setPieces] = useState<ContentPiece[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState<string | 'all'>('all')
  const [activePlatform, setActivePlatform] = useState<string | 'all'>('all')
  const [editingPiece, setEditingPiece] = useState<ContentPiece | null>(null)
  const [showNewCampaign, setShowNewCampaign] = useState(false)
  const [showGenerate, setShowGenerate] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [validating, setValidating] = useState(false)
  const [validationResults, setValidationResults] = useState<Record<string, { ok: boolean; violations: string[]; suggestion: string }>>({})
  const [saving, setSaving] = useState(false)
  const [campaignForm, setCampaignForm] = useState({ name: '', objective: '', channels: '' as string, startDate: '', endDate: '' })
  const [genForm, setGenForm] = useState({ platforms: [] as string[], count: '6', campaignId: '' })

  async function load() {
    const [cRes, pRes] = await Promise.all([
      fetch(`/api/sessions/${sessionId}/campaigns`),
      fetch(`/api/sessions/${sessionId}/content`),
    ])
    if (cRes.ok) setCampaigns(await cRes.json())
    if (pRes.ok) setPieces(await pRes.json())
  }

  useEffect(() => { load() }, [sessionId])

  async function createCampaign() {
    setSaving(true)
    await fetch(`/api/sessions/${sessionId}/campaigns`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(campaignForm),
    })
    setCampaignForm({ name: '', objective: '', channels: '', startDate: '', endDate: '' })
    setShowNewCampaign(false)
    await load()
    setSaving(false)
  }

  async function generateContent() {
    if (!genForm.platforms.length) return
    setGenerating(true)
    const res = await fetch(`/api/sessions/${sessionId}/content/generate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platforms: genForm.platforms,
        count: Number(genForm.count),
        campaignId: genForm.campaignId || null,
      }),
    })
    if (res.ok) { setShowGenerate(false); await load() }
    else {
      const err = await res.json()
      alert(`Error: ${err.error}`)
    }
    setGenerating(false)
  }

  async function updatePiece(pieceId: string, data: Partial<ContentPiece>) {
    await fetch(`/api/sessions/${sessionId}/content`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pieceId, ...data }),
    })
    await load()
  }

  async function validateBrand() {
    const ids = visiblePieces.map(p => p.id)
    if (!ids.length) return
    setValidating(true)
    const res = await fetch(`/api/sessions/${sessionId}/validate-content`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pieceIds: ids }),
    })
    if (res.ok) {
      const { results } = await res.json()
      const map: typeof validationResults = {}
      for (const r of results) map[r.pieceId] = { ok: r.ok, violations: r.violations, suggestion: r.suggestion }
      setValidationResults(map)
    }
    setValidating(false)
  }

  async function deletePiece(pieceId: string) {
    await fetch(`/api/sessions/${sessionId}/content?pieceId=${pieceId}`, { method: 'DELETE' })
    await load()
  }

  async function advanceStatus(piece: ContentPiece) {
    const next: Record<string, string> = { draft: 'ready', ready: 'scheduled', scheduled: 'published' }
    if (next[piece.status]) await updatePiece(piece.id, { status: next[piece.status] as ContentPiece['status'] })
  }

  const visiblePieces = pieces.filter(p => {
    const matchCampaign = selectedCampaign === 'all' || p.campaignId === selectedCampaign
    const matchPlatform = activePlatform === 'all' || p.platform === activePlatform
    return matchCampaign && matchPlatform
  })

  const platformCounts = PLATFORMS.reduce<Record<string, number>>((acc, plat) => {
    acc[plat] = pieces.filter(p =>
      p.platform === plat &&
      (selectedCampaign === 'all' || p.campaignId === selectedCampaign)
    ).length
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {/* Campaign selector + actions */}
      <div className="bg-white rounded-xl border border-zinc-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-zinc-900">Campañas</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowGenerate(!showGenerate)}
              className="text-xs bg-zinc-900 text-white px-3 py-1.5 rounded-lg hover:bg-zinc-700 transition"
            >
              ✨ Generar con IA
            </button>
            <button
              onClick={() => setShowNewCampaign(!showNewCampaign)}
              className="text-xs border border-zinc-200 px-3 py-1.5 rounded-lg hover:bg-zinc-50 transition"
            >
              {showNewCampaign ? 'Cancelar' : '+ Nueva campaña'}
            </button>
          </div>
        </div>

        {/* Campaign list */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCampaign('all')}
            className={`text-xs px-3 py-1.5 rounded-full border transition ${
              selectedCampaign === 'all' ? 'bg-zinc-900 text-white border-zinc-900' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'
            }`}
          >
            Todas ({pieces.length})
          </button>
          {campaigns.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCampaign(c.id)}
              className={`text-xs px-3 py-1.5 rounded-full border transition ${
                selectedCampaign === c.id ? 'bg-zinc-900 text-white border-zinc-900' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              {c.name} ({c.pieces.length})
            </button>
          ))}
        </div>

        {/* New campaign form */}
        {showNewCampaign && (
          <div className="mt-4 p-4 bg-zinc-50 rounded-lg space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-zinc-600 mb-1 block">Nombre de campaña</label>
                <input type="text" value={campaignForm.name}
                  onChange={e => setCampaignForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-600 mb-1 block">Objetivo</label>
                <input type="text" value={campaignForm.objective}
                  onChange={e => setCampaignForm(p => ({ ...p, objective: e.target.value }))}
                  placeholder="Ej: Captación de leads Mes 1"
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-zinc-600 mb-1 block">Fecha inicio</label>
                <input type="date" value={campaignForm.startDate}
                  onChange={e => setCampaignForm(p => ({ ...p, startDate: e.target.value }))}
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-600 mb-1 block">Fecha fin</label>
                <input type="date" value={campaignForm.endDate}
                  onChange={e => setCampaignForm(p => ({ ...p, endDate: e.target.value }))}
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" />
              </div>
            </div>
            <button onClick={createCampaign} disabled={!campaignForm.name || saving}
              className="bg-zinc-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-zinc-700 transition disabled:opacity-50">
              {saving ? 'Creando...' : 'Crear campaña'}
            </button>
          </div>
        )}

        {/* AI generate panel */}
        {showGenerate && (
          <div className="mt-4 p-4 bg-violet-50 border border-violet-100 rounded-lg space-y-3">
            <p className="text-xs font-semibold text-violet-900">Generar contenido con IA desde la estrategia</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-violet-800 mb-2 block">Plataformas</label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map(plat => (
                    <button key={plat}
                      onClick={() => setGenForm(p => ({
                        ...p,
                        platforms: p.platforms.includes(plat)
                          ? p.platforms.filter(x => x !== plat)
                          : [...p.platforms, plat],
                      }))}
                      className={`text-xs px-2.5 py-1 rounded-full border transition ${
                        genForm.platforms.includes(plat)
                          ? 'bg-violet-900 text-white border-violet-900'
                          : 'border-violet-200 text-violet-700 hover:bg-violet-100'
                      }`}
                    >
                      {plat}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-medium text-violet-800 mb-1 block">Cantidad de piezas</label>
                  <select value={genForm.count} onChange={e => setGenForm(p => ({ ...p, count: e.target.value }))}
                    className="w-full border border-violet-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white">
                    {[4, 6, 8, 10, 12].map(n => <option key={n} value={n}>{n} piezas</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-violet-800 mb-1 block">Asignar a campaña (opcional)</label>
                  <select value={genForm.campaignId} onChange={e => setGenForm(p => ({ ...p, campaignId: e.target.value }))}
                    className="w-full border border-violet-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white">
                    <option value="">Sin campaña</option>
                    {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <button onClick={generateContent} disabled={!genForm.platforms.length || generating}
              className="bg-violet-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-violet-800 transition disabled:opacity-50 flex items-center gap-2">
              {generating ? (
                <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generando con IA...</>
              ) : '✨ Generar piezas'}
            </button>
            {generating && <p className="text-xs text-violet-600">Esto toma ~30 segundos. Claude está creando el contenido desde tu estrategia.</p>}
          </div>
        )}
      </div>

      {/* Platform filter + grid */}
      <div className="bg-white rounded-xl border border-zinc-100 overflow-hidden">
        {/* Platform tabs + validate button */}
        <div className="flex items-center border-b border-zinc-100">
        <div className="flex overflow-x-auto flex-1">
          <button
            onClick={() => setActivePlatform('all')}
            className={`px-4 py-3 text-xs font-medium whitespace-nowrap transition ${
              activePlatform === 'all' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:bg-zinc-50'
            }`}
          >
            Todas ({visiblePieces.length})
          </button>
          {PLATFORMS.filter(p => platformCounts[p] > 0 || activePlatform === p).map(plat => (
            <button key={plat}
              onClick={() => setActivePlatform(plat)}
              className={`px-4 py-3 text-xs font-medium whitespace-nowrap transition ${
                activePlatform === plat ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:bg-zinc-50'
              }`}
            >
              {PLATFORM_ICONS[plat]} {plat} ({platformCounts[plat]})
            </button>
          ))}
        </div>
        {visiblePieces.length > 0 && (
          <button onClick={validateBrand} disabled={validating}
            className="px-4 py-2 text-xs font-medium text-violet-700 hover:bg-violet-50 border-l border-zinc-100 whitespace-nowrap transition flex-shrink-0 disabled:opacity-50">
            {validating ? '...' : '🛡 Validar marca'}
          </button>
        )}
        </div>

        {visiblePieces.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-2xl mb-3">✍️</p>
            <p className="text-sm font-semibold text-zinc-700 mb-1">Sin piezas de contenido</p>
            <p className="text-xs text-zinc-400">Usa "Generar con IA" o crea piezas manualmente.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-50">
            {visiblePieces.map(piece => (
              <div key={piece.id} className="px-5 py-4 hover:bg-zinc-50 transition group">
                {editingPiece?.id === piece.id ? (
                  /* Edit mode */
                  <EditPieceForm
                    piece={editingPiece}
                    onChange={setEditingPiece}
                    onSave={async () => {
                      await updatePiece(editingPiece.id, {
                        hook: editingPiece.hook,
                        body: editingPiece.body,
                        cta: editingPiece.cta,
                        hashtags: editingPiece.hashtags,
                        status: editingPiece.status,
                      })
                      setEditingPiece(null)
                    }}
                    onCancel={() => setEditingPiece(null)}
                  />
                ) : (
                  /* View mode */
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PLATFORM_COLORS[piece.platform] ?? 'bg-zinc-100 text-zinc-600'}`}>
                          {PLATFORM_ICONS[piece.platform]} {piece.platform}
                        </span>
                        <span className="text-xs text-zinc-400 capitalize">{piece.format}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[piece.status] ?? ''}`}>
                          {STATUS_LABELS[piece.status]}
                        </span>
                        {piece.aiGenerated && <span className="text-xs text-violet-500">✨ IA</span>}
                      </div>
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition flex-shrink-0">
                        <button onClick={() => advanceStatus(piece)}
                          className="text-xs text-zinc-500 hover:text-zinc-900 border border-zinc-200 px-2 py-1 rounded-lg transition"
                          title="Avanzar estado">→</button>
                        <button onClick={() => setEditingPiece(piece)}
                          className="text-xs text-zinc-500 hover:text-zinc-900 border border-zinc-200 px-2 py-1 rounded-lg transition">
                          Editar
                        </button>
                        <button onClick={() => deletePiece(piece.id)}
                          className="text-xs text-red-400 hover:text-red-600 border border-red-100 px-2 py-1 rounded-lg transition">
                          ✕
                        </button>
                      </div>
                    </div>
                    {piece.hook && (
                      <p className="text-sm font-semibold text-zinc-900 mt-2 leading-snug">{piece.hook}</p>
                    )}
                    {piece.body && (
                      <p className="text-sm text-zinc-600 mt-1 leading-relaxed whitespace-pre-wrap line-clamp-3">{piece.body}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      {piece.cta && <span className="text-xs text-blue-600 font-medium">→ {piece.cta}</span>}
                      {piece.hashtags && <span className="text-xs text-zinc-400 truncate max-w-xs">{piece.hashtags}</span>}
                    </div>
                    {validationResults[piece.id] && !validationResults[piece.id].ok && (
                      <div className="mt-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                        <p className="text-xs font-semibold text-red-700 mb-1">⚠ Violación de marca detectada</p>
                        {validationResults[piece.id].violations.map((v, i) => (
                          <p key={i} className="text-xs text-red-600">{v}</p>
                        ))}
                        {validationResults[piece.id].suggestion && (
                          <p className="text-xs text-zinc-600 mt-1 italic">Sugerencia: {validationResults[piece.id].suggestion}</p>
                        )}
                      </div>
                    )}
                    {validationResults[piece.id]?.ok && (
                      <p className="text-xs text-green-600 mt-1 font-medium">✓ Validado — alineado con la marca</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function EditPieceForm({
  piece, onChange, onSave, onCancel,
}: {
  piece: ContentPiece
  onChange: (p: ContentPiece) => void
  onSave: () => void
  onCancel: () => void
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-zinc-600 mb-1 block">Hook (primera línea)</label>
        <input type="text" value={piece.hook}
          onChange={e => onChange({ ...piece, hook: e.target.value })}
          className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" />
      </div>
      <div>
        <label className="text-xs font-medium text-zinc-600 mb-1 block">Cuerpo del mensaje</label>
        <textarea rows={4} value={piece.body}
          onChange={e => onChange({ ...piece, body: e.target.value })}
          className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-zinc-600 mb-1 block">CTA</label>
          <input type="text" value={piece.cta}
            onChange={e => onChange({ ...piece, cta: e.target.value })}
            className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" />
        </div>
        <div>
          <label className="text-xs font-medium text-zinc-600 mb-1 block">Hashtags</label>
          <input type="text" value={piece.hashtags}
            onChange={e => onChange({ ...piece, hashtags: e.target.value })}
            className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onSave}
          className="bg-zinc-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-zinc-700 transition">
          Guardar
        </button>
        <button onClick={onCancel}
          className="text-sm text-zinc-500 hover:text-zinc-900 px-3 py-2 transition">
          Cancelar
        </button>
      </div>
    </div>
  )
}
