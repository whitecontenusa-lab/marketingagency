'use client'
import { useEffect, useState } from 'react'

interface ReportSection {
  title: string
  content: string
}

interface InternalReportContent {
  headline: string
  summary: string
  signals: string[]
  risks: string[]
  actionItems: string[]
  sections: ReportSection[]
}

interface ClientReportContent {
  headline: string
  summary: string
  achievements: string[]
  nextMonthPreview: string
  sections: ReportSection[]
}

interface ClientReport {
  id: string
  sessionId: string
  type: string
  month: number
  year: number
  content: string
  generatedAt: string
  sentAt: string | null
}

const MONTH_LABELS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function CollapsibleSection({ title, content }: ReportSection) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-zinc-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-left hover:bg-zinc-50 transition"
      >
        <span>{title}</span>
        <span className="text-zinc-400 text-xs ml-2">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm text-zinc-600 leading-relaxed border-t border-zinc-100">
          <p className="pt-3">{content}</p>
        </div>
      )}
    </div>
  )
}

export function TabReportes({ sessionId }: { sessionId: string }) {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [reports, setReports] = useState<ClientReport[]>([])
  const [generating, setGenerating] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  async function fetchReports() {
    try {
      const res = await fetch(`/api/reports/${sessionId}`)
      if (res.ok) setReports(await res.json())
    } catch {
      // silent
    }
  }

  useEffect(() => {
    fetchReports()
  }, [sessionId]) // eslint-disable-line react-hooks/exhaustive-deps

  const internalReport = reports.find(
    r => r.type === 'internal' && r.month === month && r.year === year,
  )
  const clientReport = reports.find(
    r => r.type === 'client' && r.month === month && r.year === year,
  )

  async function generate() {
    setGenerating(true)
    setError('')
    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, month, year }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error generando reportes')
      await fetchReports()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setGenerating(false)
    }
  }

  async function sendToClient() {
    if (!clientReport) return
    setSending(true)
    setError('')
    try {
      const res = await fetch(`/api/reports/${sessionId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: clientReport.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error enviando reporte')
      // Update sentAt in local state
      setReports(prev =>
        prev.map(r => (r.id === clientReport.id ? { ...r, sentAt: data.sentAt } : r)),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setSending(false)
    }
  }

  const internalContent: InternalReportContent | null = internalReport
    ? (() => { try { return JSON.parse(internalReport.content) } catch { return null } })()
    : null

  const clientContent: ClientReportContent | null = clientReport
    ? (() => { try { return JSON.parse(clientReport.content) } catch { return null } })()
    : null

  const currentYear = now.getFullYear()

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white rounded-2xl border border-zinc-100 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1 font-medium uppercase tracking-wide">Mes</label>
            <select
              value={month}
              onChange={e => setMonth(Number(e.target.value))}
              className="border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
            >
              {MONTH_LABELS_ES.map((label, i) => (
                <option key={i + 1} value={i + 1}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1 font-medium uppercase tracking-wide">Año</label>
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
            >
              <option value={currentYear}>{currentYear}</option>
              <option value={currentYear - 1}>{currentYear - 1}</option>
            </select>
          </div>
          <div className="flex-1" />
          <button
            onClick={generate}
            disabled={generating}
            className="mt-5 bg-zinc-900 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-zinc-700 transition disabled:opacity-50 flex items-center gap-2"
          >
            {generating ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generando reportes con IA...
              </>
            ) : (
              <>⚡ Generar reporte</>
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* Generating spinner */}
      {generating && (
        <div className="bg-purple-50 border border-purple-100 rounded-2xl p-6 text-center">
          <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-purple-700 text-sm font-medium">Generando reportes con IA...</p>
          <p className="text-purple-500 text-xs mt-1">Esto puede tomar hasta 2 minutos.</p>
        </div>
      )}

      {/* Reports grid */}
      {!generating && internalContent && clientContent && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* LEFT — Internal Report */}
          <div className="bg-zinc-900 text-white rounded-2xl p-6 space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-2">
                Reporte Interno
              </p>
              <p className="font-bold text-lg leading-snug">{internalContent.headline}</p>
            </div>

            <p className="text-sm text-zinc-300 leading-relaxed">{internalContent.summary}</p>

            {internalContent.signals && internalContent.signals.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-2">Hitos</p>
                <ul className="space-y-1.5">
                  {internalContent.signals.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                      <span className="text-green-400 flex-shrink-0 mt-0.5">•</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {internalContent.risks && internalContent.risks.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-2">Riesgos</p>
                <ul className="space-y-1.5">
                  {internalContent.risks.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                      <span className="text-red-400 flex-shrink-0 mt-0.5">•</span>
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {internalContent.actionItems && internalContent.actionItems.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-2">Acciones</p>
                <ul className="space-y-1.5">
                  {internalContent.actionItems.map((a, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                      <span className="text-yellow-400 flex-shrink-0 mt-0.5">•</span>
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {internalContent.sections && internalContent.sections.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-2">Secciones</p>
                {internalContent.sections.map((s, i) => (
                  <div key={i} className="border border-zinc-700 rounded-lg overflow-hidden">
                    <CollapsibleSectionDark title={s.title} content={s.content} />
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-zinc-500">
              Generado: {new Date(internalReport!.generatedAt).toLocaleString('es-CO')}
            </p>
          </div>

          {/* RIGHT — Client Report */}
          <div className="bg-white rounded-2xl border border-zinc-100 p-6 space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-2">
                Reporte para Cliente
              </p>
              <p className="font-bold text-lg text-zinc-900 leading-snug">{clientContent.headline}</p>
            </div>

            <p className="text-sm text-zinc-600 leading-relaxed">{clientContent.summary}</p>

            {clientContent.achievements && clientContent.achievements.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-2">Logros</p>
                <ul className="space-y-2">
                  {clientContent.achievements.map((a, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-zinc-700">
                      <span className="text-green-500 flex-shrink-0 mt-0.5 font-bold">&#10003;</span>
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {clientContent.nextMonthPreview && (
              <div className="bg-zinc-50 rounded-xl p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-1.5">Vista previa del mes que viene</p>
                <p className="text-sm text-zinc-600 leading-relaxed">{clientContent.nextMonthPreview}</p>
              </div>
            )}

            {clientContent.sections && clientContent.sections.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-2">Secciones</p>
                {clientContent.sections.map((s, i) => (
                  <CollapsibleSection key={i} title={s.title} content={s.content} />
                ))}
              </div>
            )}

            {/* Send footer */}
            <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
              <p className="text-xs text-zinc-400">
                Generado: {new Date(clientReport!.generatedAt).toLocaleString('es-CO')}
              </p>
              {clientReport!.sentAt ? (
                <span className="inline-flex items-center gap-1.5 text-xs bg-green-50 text-green-700 px-3 py-1.5 rounded-full font-medium border border-green-100">
                  <span>&#10003;</span>
                  Enviado el {new Date(clientReport!.sentAt).toLocaleDateString('es-CO')}
                </span>
              ) : (
                <button
                  onClick={sendToClient}
                  disabled={sending}
                  className="inline-flex items-center gap-1.5 text-xs bg-zinc-900 text-white px-4 py-2 rounded-lg font-semibold hover:bg-zinc-700 transition disabled:opacity-50"
                >
                  {sending ? (
                    <>
                      <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <> Enviar al cliente</>
                  )}
                </button>
              )}
            </div>
          </div>

        </div>
      )}

      {/* Empty state */}
      {!generating && (!internalContent || !clientContent) && (
        <div className="bg-white rounded-2xl border border-zinc-100 p-10 text-center">
          <div className="w-14 h-14 bg-zinc-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">
            📊
          </div>
          <h3 className="text-lg font-bold text-zinc-900 mb-2">
            Sin reporte para {MONTH_LABELS_ES[month - 1]} {year}
          </h3>
          <p className="text-sm text-zinc-500 max-w-sm mx-auto">
            Haz clic en "Generar reporte" para que la IA cree el reporte interno y el reporte del cliente para este mes.
          </p>
        </div>
      )}
    </div>
  )
}

// Dark variant of collapsible section for internal report card
function CollapsibleSectionDark({ title, content }: ReportSection) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-left text-zinc-300 hover:bg-zinc-800 transition"
      >
        <span>{title}</span>
        <span className="text-zinc-500 text-xs ml-2">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm text-zinc-400 leading-relaxed border-t border-zinc-700">
          <p className="pt-3">{content}</p>
        </div>
      )}
    </>
  )
}
