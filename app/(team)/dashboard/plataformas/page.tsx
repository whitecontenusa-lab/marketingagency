'use client'
import { useEffect, useState, useCallback } from 'react'

interface PlatformRecord {
  id: string
  platform: string
  algorithmPriorities: string
  bestFormats: string
  bestFrequency: string
  optimalTiming: string
  currentTrends: string
  avoidList: string
  recentChanges: string
  emergingFeatures: string
  confidence: string
  teamNotes: string
  status: string
  generatedAt: string
  approvedAt: string | null
  approvedBy: string | null
}

type ParsedArray = Array<Record<string, string>>

function tryParseArray(str: string): ParsedArray {
  try { return JSON.parse(str) } catch { return [] }
}

const PLATFORM_ICONS: Record<string, string> = {
  instagram: '📸',
  tiktok: '🎵',
  facebook: '👥',
  youtube: '▶️',
  threads: '🧵',
  linkedin: '💼',
  pinterest: '📌',
  x: '𝕏',
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  archived: 'bg-zinc-100 text-zinc-500',
}

export default function PlataformasPage() {
  const [records, setRecords] = useState<PlatformRecord[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editNotes, setEditNotes] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/platform-intelligence')
      if (res.ok) setRecords(await res.json())
    } catch { setError('Error loading platform intelligence') }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function triggerRefresh() {
    setRefreshing(true)
    setError('')
    try {
      const res = await fetch('/api/platform-intelligence/refresh', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Refresh failed'); return }
      alert('Generación iniciada en segundo plano. Las plataformas aparecerán como borrador en ~15-20 minutos. Recarga la página para ver el progreso.')
    } catch { setError('Error triggering refresh') }
    setRefreshing(false)
  }

  async function patchPlatform(platform: string, payload: Record<string, unknown>) {
    setSaving(platform)
    try {
      const res = await fetch(`/api/platform-intelligence/${platform}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const updated = await res.json()
        setRecords(prev => prev.map(r => r.platform === platform ? updated : r))
      }
    } catch { /* ignore */ }
    setSaving(null)
  }

  async function saveNotes(platform: string) {
    await patchPlatform(platform, { teamNotes: editNotes[platform] ?? '' })
  }

  const ALL_PLATFORMS = ['instagram', 'tiktok', 'facebook', 'youtube', 'threads', 'linkedin', 'pinterest', 'x']

  // Merge DB records with all expected platforms
  const platforms = ALL_PLATFORMS.map(p => records.find(r => r.platform === p) ?? null)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Inteligencia de Plataformas</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Actualización automática cada lunes 8am UTC · Revisa y aprueba antes de que afecte la generación de contenido
          </p>
        </div>
        <button
          onClick={triggerRefresh}
          disabled={refreshing}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
        >
          {refreshing ? '⏳ Iniciando...' : '🔄 Regenerar todas'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      <div className="mb-4 p-3 bg-blue-50 text-blue-800 rounded-lg text-sm">
        ⚠️ Los borradores NO afectan la generación de contenido. Solo los registros con estado <strong>Aprobado</strong> se inyectan en las estrategias y ciclos de contenido.
      </div>

      {loading ? (
        <div className="text-center py-12 text-zinc-400">Cargando...</div>
      ) : (
        <div className="space-y-3">
          {ALL_PLATFORMS.map((platformName, idx) => {
            const record = platforms[idx]
            const icon = PLATFORM_ICONS[platformName] ?? '📱'
            const isExpanded = expanded === platformName

            if (!record) {
              return (
                <div key={platformName} className="border border-zinc-200 rounded-xl p-4 flex items-center justify-between bg-zinc-50">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{icon}</span>
                    <div>
                      <div className="font-semibold capitalize text-zinc-700">{platformName}</div>
                      <div className="text-xs text-zinc-400">Sin datos — regenerar para obtener inteligencia</div>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-zinc-100 text-zinc-500">Sin datos</span>
                </div>
              )
            }

            const priorities = tryParseArray(record.algorithmPriorities)
            const formats = tryParseArray(record.bestFormats)
            const trends = tryParseArray(record.currentTrends)
            const avoid = tryParseArray(record.avoidList)
            const changes = tryParseArray(record.recentChanges)
            const features = tryParseArray(record.emergingFeatures)
            const statusColor = STATUS_COLORS[record.status] ?? STATUS_COLORS.draft
            const generatedDate = new Date(record.generatedAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })

            return (
              <div key={platformName} className="border border-zinc-200 rounded-xl overflow-hidden bg-white">
                {/* Header row */}
                <button
                  className="w-full flex items-center justify-between p-4 hover:bg-zinc-50 transition-colors text-left"
                  onClick={() => setExpanded(isExpanded ? null : platformName)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{icon}</span>
                    <div>
                      <div className="font-semibold capitalize text-zinc-900">{platformName}</div>
                      <div className="text-xs text-zinc-400">
                        Generado: {generatedDate}
                        {record.approvedBy && ` · Aprobado por ${record.approvedBy}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor}`}>
                      {record.status === 'draft' ? 'Borrador' : record.status === 'approved' ? 'Aprobado' : 'Archivado'}
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full bg-zinc-100 text-zinc-600">
                      Confianza: {record.confidence}
                    </span>
                    <span className="text-zinc-400 ml-2">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-zinc-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">

                      {/* Algorithm Priorities */}
                      <div className="bg-zinc-50 rounded-lg p-3">
                        <h4 className="text-xs font-semibold text-zinc-500 uppercase mb-2">Prioridades del Algoritmo</h4>
                        <ul className="space-y-1">
                          {priorities.map((p, i) => (
                            <li key={i} className="text-xs text-zinc-700 flex gap-1.5">
                              <span className="text-zinc-400">{i + 1}.</span>
                              <span>{typeof p === 'string' ? p : p.what ?? JSON.stringify(p)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Best Formats */}
                      <div className="bg-zinc-50 rounded-lg p-3">
                        <h4 className="text-xs font-semibold text-zinc-500 uppercase mb-2">Mejores Formatos</h4>
                        <ul className="space-y-1.5">
                          {formats.map((f, i) => (
                            <li key={i} className="text-xs">
                              <span className="font-medium text-zinc-800">{f.format}</span>
                              <span className="text-zinc-500"> — {f.why}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Frequency & Timing */}
                      <div className="bg-zinc-50 rounded-lg p-3">
                        <h4 className="text-xs font-semibold text-zinc-500 uppercase mb-2">Frecuencia y Horarios</h4>
                        <p className="text-xs text-zinc-700 mb-1"><strong>Frecuencia:</strong> {record.bestFrequency}</p>
                        <p className="text-xs text-zinc-700"><strong>Horarios:</strong> {record.optimalTiming}</p>
                      </div>

                      {/* Current Trends */}
                      <div className="bg-zinc-50 rounded-lg p-3">
                        <h4 className="text-xs font-semibold text-zinc-500 uppercase mb-2">Tendencias Actuales</h4>
                        <ul className="space-y-1.5">
                          {trends.slice(0, 3).map((t, i) => (
                            <li key={i} className="text-xs">
                              <span className="font-medium text-zinc-800">{t.trend}</span>
                              <span className="text-zinc-500"> — {t.angle}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Avoid List */}
                      <div className="bg-red-50 rounded-lg p-3">
                        <h4 className="text-xs font-semibold text-red-600 uppercase mb-2">Evitar (Shadowban / Penalización)</h4>
                        <ul className="space-y-1">
                          {avoid.map((a, i) => (
                            <li key={i} className="text-xs text-zinc-700 flex gap-1.5">
                              <span className="text-red-400">✗</span>
                              <span><strong>{a.what}</strong> — {a.why}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Recent Changes */}
                      <div className="bg-blue-50 rounded-lg p-3">
                        <h4 className="text-xs font-semibold text-blue-600 uppercase mb-2">Cambios Recientes del Algoritmo</h4>
                        <ul className="space-y-1.5">
                          {changes.map((c, i) => (
                            <li key={i} className="text-xs">
                              <span className="font-medium text-zinc-800">{c.change}</span>
                              <span className="text-zinc-500"> — {c.impact}</span>
                              {c.when && <span className="text-blue-500"> ({c.when})</span>}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Emerging Features */}
                      {features.length > 0 && (
                        <div className="bg-purple-50 rounded-lg p-3 md:col-span-2">
                          <h4 className="text-xs font-semibold text-purple-600 uppercase mb-2">Funciones Emergentes</h4>
                          <div className="flex flex-wrap gap-2">
                            {features.map((f, i) => (
                              <div key={i} className="text-xs bg-white rounded px-2 py-1 border border-purple-100">
                                <span className="font-medium text-purple-800">{f.feature}</span>
                                <span className="text-zinc-500"> — {f.useCase}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Team Notes */}
                    <div className="mt-4">
                      <h4 className="text-xs font-semibold text-zinc-500 uppercase mb-2">Notas del Equipo (visibles solo internamente)</h4>
                      <textarea
                        className="w-full text-sm p-3 border border-zinc-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-400"
                        rows={3}
                        placeholder="Agrega notas sobre cambios recientes que el equipo haya detectado..."
                        value={editNotes[platformName] ?? record.teamNotes}
                        onChange={e => setEditNotes(prev => ({ ...prev, [platformName]: e.target.value }))}
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-3">
                      {record.status !== 'approved' && (
                        <button
                          onClick={() => patchPlatform(platformName, { action: 'approve', teamNotes: editNotes[platformName] ?? record.teamNotes })}
                          disabled={saving === platformName}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                          {saving === platformName ? '...' : '✓ Aprobar y activar'}
                        </button>
                      )}
                      {record.status === 'approved' && (
                        <button
                          onClick={() => patchPlatform(platformName, { action: 'draft' })}
                          disabled={saving === platformName}
                          className="px-4 py-2 bg-amber-500 text-white rounded-lg text-xs font-medium hover:bg-amber-600 disabled:opacity-50 transition-colors"
                        >
                          {saving === platformName ? '...' : '↩ Volver a borrador'}
                        </button>
                      )}
                      <button
                        onClick={() => saveNotes(platformName)}
                        disabled={saving === platformName}
                        className="px-4 py-2 bg-zinc-700 text-white rounded-lg text-xs font-medium hover:bg-zinc-800 disabled:opacity-50 transition-colors"
                      >
                        {saving === platformName ? '...' : 'Guardar notas'}
                      </button>
                      {record.status !== 'archived' && (
                        <button
                          onClick={() => patchPlatform(platformName, { action: 'archive' })}
                          disabled={saving === platformName}
                          className="px-3 py-2 text-zinc-400 hover:text-zinc-600 text-xs transition-colors"
                        >
                          Archivar
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
