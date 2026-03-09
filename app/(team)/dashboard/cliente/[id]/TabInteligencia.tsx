'use client'
import { useEffect, useState } from 'react'

interface Competitor { name: string; positioning: string; weakness: string }
interface Trend { trend: string; impact: string; opportunity: string }
interface MarketIntel {
  id: string; industry: string; country: string
  rawSummary: string; positioning: string
  competitors: string; trends: string; keywords: string
  generatedAt: string
}
interface HealthScore {
  score: number
  breakdown: { label: string; points: number; max: number; done: boolean }[]
}

function parseJson<T>(s: string, fallback: T): T {
  try { return JSON.parse(s) } catch { return fallback }
}

export default function TabInteligencia({ sessionId }: { sessionId: string }) {
  const [intel, setIntel] = useState<MarketIntel | null>(null)
  const [health, setHealth] = useState<HealthScore | null>(null)
  const [running, setRunning] = useState(false)
  const [activeSection, setActiveSection] = useState<'market' | 'health'>('market')

  async function load() {
    const [mRes, hRes] = await Promise.all([
      fetch(`/api/sessions/${sessionId}/market-research`),
      fetch(`/api/sessions/${sessionId}/health`),
    ])
    if (mRes.ok) { const d = await mRes.json(); setIntel(d) }
    if (hRes.ok) { const d = await hRes.json(); setHealth(d) }
  }

  useEffect(() => { load() }, [sessionId])

  async function runMarketResearch() {
    setRunning(true)
    const res = await fetch(`/api/sessions/${sessionId}/market-research`, { method: 'POST' })
    if (res.ok) { const d = await res.json(); setIntel(d) }
    else { const e = await res.json(); alert(e.error) }
    setRunning(false)
  }

  const competitors: Competitor[] = intel ? parseJson(intel.competitors, []) : []
  const trends: Trend[] = intel ? parseJson(intel.trends, []) : []
  const keywords: string[] = intel ? parseJson(intel.keywords, []) : []

  return (
    <div className="space-y-6">
      {/* Section tabs */}
      <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl w-fit">
        {(['market', 'health'] as const).map(s => (
          <button key={s} onClick={() => setActiveSection(s)}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition ${
              activeSection === s ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
            }`}>
            {s === 'market' ? '🔍 Inteligencia de mercado' : '📊 Salud del cliente'}
          </button>
        ))}
      </div>

      {activeSection === 'market' && (
        <>
          {/* Market research header */}
          <div className="bg-white rounded-xl border border-zinc-100 p-5">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-semibold text-zinc-900">Análisis de mercado</p>
                {intel && (
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Analizado: {new Date(intel.generatedAt).toLocaleString('es-CO')} · {intel.industry} · {intel.country}
                  </p>
                )}
              </div>
              <button onClick={runMarketResearch} disabled={running}
                className="text-xs bg-zinc-900 text-white px-3 py-1.5 rounded-lg hover:bg-zinc-700 transition disabled:opacity-50 flex items-center gap-2">
                {running ? (
                  <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Analizando...</>
                ) : intel ? '↺ Re-analizar mercado' : '🔍 Analizar mercado'}
              </button>
            </div>
            {running && <p className="text-xs text-zinc-400 mt-2">El agente está analizando competidores, tendencias y posicionamiento. ~30 segundos.</p>}

            {!intel && !running && (
              <div className="py-8 text-center">
                <p className="text-2xl mb-3">🔍</p>
                <p className="text-sm text-zinc-500">No hay análisis de mercado aún.</p>
                <p className="text-xs text-zinc-400 mt-1">Este análisis se inyecta automáticamente en la siguiente generación de estrategia.</p>
              </div>
            )}

            {intel && (
              <div className="mt-4 bg-zinc-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2">Resumen ejecutivo</p>
                <p className="text-sm text-zinc-700 leading-relaxed">{intel.rawSummary}</p>
              </div>
            )}
          </div>

          {intel && (
            <>
              {/* Positioning */}
              <div className="bg-white rounded-xl border border-zinc-100 p-5">
                <p className="text-sm font-semibold text-zinc-900 mb-3">Oportunidad de posicionamiento</p>
                <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap">{intel.positioning}</p>
              </div>

              {/* Competitors + Trends grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Competitors */}
                <div className="bg-white rounded-xl border border-zinc-100 p-5">
                  <p className="text-sm font-semibold text-zinc-900 mb-3">Competidores / categorías</p>
                  <div className="space-y-3">
                    {competitors.map((c, i) => (
                      <div key={i} className="border-l-2 border-zinc-200 pl-3">
                        <p className="text-sm font-medium text-zinc-900">{c.name}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">{c.positioning}</p>
                        <p className="text-xs text-green-600 mt-0.5">↳ Su debilidad: {c.weakness}</p>
                      </div>
                    ))}
                    {competitors.length === 0 && <p className="text-xs text-zinc-400">Sin datos</p>}
                  </div>
                </div>

                {/* Trends */}
                <div className="bg-white rounded-xl border border-zinc-100 p-5">
                  <p className="text-sm font-semibold text-zinc-900 mb-3">Tendencias del mercado</p>
                  <div className="space-y-3">
                    {trends.map((t, i) => (
                      <div key={i} className="border-l-2 border-blue-200 pl-3">
                        <p className="text-sm font-medium text-zinc-900">{t.trend}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">{t.impact}</p>
                        <p className="text-xs text-blue-600 mt-0.5">↳ {t.opportunity}</p>
                      </div>
                    ))}
                    {trends.length === 0 && <p className="text-xs text-zinc-400">Sin datos</p>}
                  </div>
                </div>
              </div>

              {/* Keywords */}
              {keywords.length > 0 && (
                <div className="bg-white rounded-xl border border-zinc-100 p-5">
                  <p className="text-sm font-semibold text-zinc-900 mb-3">Keywords estratégicas</p>
                  <div className="flex flex-wrap gap-2">
                    {keywords.map((kw, i) => (
                      <span key={i} className="text-xs bg-zinc-100 text-zinc-700 px-3 py-1 rounded-full font-medium">{kw}</span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {activeSection === 'health' && health && (
        <>
          {/* Health score card */}
          <div className="bg-white rounded-xl border border-zinc-100 p-5">
            <div className="flex items-center gap-6 mb-5">
              <div className="relative w-24 h-24 flex-shrink-0">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none" stroke="#f4f4f5" strokeWidth="3" />
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none" stroke={health.score >= 80 ? '#16a34a' : health.score >= 50 ? '#2563eb' : '#d97706'}
                    strokeWidth="3"
                    strokeDasharray={`${health.score}, 100`} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-zinc-900">{health.score}</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900 mb-1">Salud del cliente</p>
                <p className="text-xs text-zinc-500">
                  {health.score >= 80 ? 'Cliente activo y bien configurado' :
                   health.score >= 50 ? 'En proceso — algunos pasos pendientes' :
                   'Atención requerida — hay elementos críticos sin completar'}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {health.breakdown.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
                    item.done ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-400'
                  }`}>
                    {item.done ? '✓' : '○'}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-zinc-700">{item.label}</span>
                      <span className="text-xs text-zinc-400">{item.points}/{item.max} pts</span>
                    </div>
                    <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${item.done ? 'bg-green-500' : 'bg-zinc-300'}`}
                        style={{ width: `${(item.points / item.max) * 100}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeSection === 'health' && !health && (
        <div className="bg-white rounded-xl border border-zinc-100 p-10 text-center">
          <p className="text-zinc-400 text-sm">Cargando score...</p>
        </div>
      )}
    </div>
  )
}
