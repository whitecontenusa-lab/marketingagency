'use client'
import { useCallback, useEffect, useState } from 'react'

interface ReportSection {
  title: string
  content: string
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
  type: string
  month: number
  year: number
  content: string
  generatedAt: string
  sentAt: string | null
}

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December']

function CollapsibleSection({ title, content }: ReportSection) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-zinc-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-left hover:bg-zinc-50 transition"
      >
        <span className="text-zinc-800">{title}</span>
        <span className="text-zinc-400 text-xs ml-2 flex-shrink-0">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm text-zinc-600 leading-relaxed border-t border-zinc-100">
          <p className="pt-3">{content}</p>
        </div>
      )}
    </div>
  )
}

export default function TabMisReportes({ sessionId, lang }: { sessionId: string; lang: 'es' | 'en' }) {
  const [reports, setReports] = useState<ClientReport[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<ClientReport | null>(null)

  const MONTHS = lang === 'en' ? MONTHS_EN : MONTHS_ES

  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch(`/api/reports/${sessionId}`)
      if (res.ok) {
        const data: ClientReport[] = await res.json()
        setReports(data)
        if (data.length > 0 && !selected) setSelected(data[0])
      }
    } finally {
      setLoading(false)
    }
  }, [sessionId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchReports() }, [fetchReports])

  const reportContent: ClientReportContent | null = selected
    ? (() => { try { return JSON.parse(selected.content) } catch { return null } })()
    : null

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
    </div>
  )

  if (reports.length === 0) return (
    <div className="bg-white rounded-2xl border border-zinc-100 p-10 text-center">
      <div className="w-14 h-14 bg-zinc-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">📊</div>
      <h3 className="text-lg font-bold text-zinc-900 mb-2">
        {lang === 'es' ? 'Sin reportes aún' : 'No reports yet'}
      </h3>
      <p className="text-sm text-zinc-500 max-w-xs mx-auto">
        {lang === 'es'
          ? 'Tu primer reporte mensual estará disponible aquí al final del mes.'
          : 'Your first monthly report will be available here at the end of the month.'}
      </p>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Report selector pills */}
      {reports.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {reports.map(r => (
            <button
              key={r.id}
              onClick={() => setSelected(r)}
              className={`text-xs px-4 py-2 rounded-full font-medium transition ${
                selected?.id === r.id
                  ? 'bg-zinc-900 text-white'
                  : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              {MONTHS[r.month - 1]} {r.year}
            </button>
          ))}
        </div>
      )}

      {/* Report card */}
      {selected && reportContent && (
        <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
          {/* Header */}
          <div className="bg-zinc-900 p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-2">
              {MONTHS[selected.month - 1]} {selected.year}
            </p>
            <h3 className="text-xl font-bold text-white leading-snug">{reportContent.headline}</h3>
          </div>

          <div className="p-6 space-y-6">
            {/* Summary */}
            <p className="text-sm text-zinc-600 leading-relaxed">{reportContent.summary}</p>

            {/* Achievements */}
            {reportContent.achievements && reportContent.achievements.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-3">
                  {lang === 'es' ? 'Logros del mes' : 'Monthly achievements'}
                </p>
                <ul className="space-y-2">
                  {reportContent.achievements.map((a, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-zinc-700">
                      <span className="text-green-500 flex-shrink-0 mt-0.5 font-bold">✓</span>
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Next month preview */}
            {reportContent.nextMonthPreview && (
              <div className="bg-zinc-50 rounded-xl p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-2">
                  {lang === 'es' ? 'Lo que viene' : "What's next"}
                </p>
                <p className="text-sm text-zinc-600 leading-relaxed">{reportContent.nextMonthPreview}</p>
              </div>
            )}

            {/* Collapsible sections */}
            {reportContent.sections && reportContent.sections.length > 0 && (
              <div className="space-y-2">
                {reportContent.sections.map((s, i) => (
                  <CollapsibleSection key={i} title={s.title} content={s.content} />
                ))}
              </div>
            )}

            {/* Footer */}
            <p className="text-xs text-zinc-400 pt-2 border-t border-zinc-100">
              {lang === 'es' ? 'Generado el' : 'Generated on'}{' '}
              {new Date(selected.generatedAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'es-CO', {
                year: 'numeric', month: 'long', day: 'numeric',
              })}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
