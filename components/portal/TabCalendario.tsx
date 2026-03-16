'use client'
import { useEffect, useState } from 'react'

interface ContentPiece {
  id: string
  platform: string
  format: string
  hook: string
  body: string
  cta: string
  hashtags: string
  funnelStage: string
  week: number
  status: string
  scheduledAt: string | null
  releasedAt: string | null
  cycleId: string | null
}

const PLATFORM_COLORS: Record<string, string> = {
  instagram: 'bg-pink-500',
  tiktok: 'bg-zinc-800',
  facebook: 'bg-blue-500',
  linkedin: 'bg-sky-600',
  youtube: 'bg-red-500',
  threads: 'bg-zinc-600',
  pinterest: 'bg-red-600',
  x: 'bg-zinc-700',
  email: 'bg-amber-500',
  blog: 'bg-green-500',
}

const FUNNEL_COLORS: Record<string, string> = {
  tofu: 'border-l-emerald-400',
  mofu: 'border-l-amber-400',
  bofu: 'border-l-rose-400',
}

const strings = {
  es: {
    title: 'Calendario de Contenido',
    noPieces: 'No hay piezas programadas este mes.',
    scheduled: 'Programado',
    noDate: 'Sin fecha',
    week: (n: number) => `Semana ${n}`,
    viewMode: 'Vista',
    weekly: 'Semanal',
    monthly: 'Mensual',
    today: 'Hoy',
    prev: '← Anterior',
    next: 'Siguiente →',
    tofu: 'Conciencia',
    mofu: 'Consideración',
    bofu: 'Decisión',
  },
  en: {
    title: 'Content Calendar',
    noPieces: 'No pieces scheduled this month.',
    scheduled: 'Scheduled',
    noDate: 'No date',
    week: (n: number) => `Week ${n}`,
    viewMode: 'View',
    weekly: 'Weekly',
    monthly: 'Monthly',
    today: 'Today',
    prev: '← Previous',
    next: 'Next →',
    tofu: 'Awareness',
    mofu: 'Consideration',
    bofu: 'Decision',
  },
}

function formatDate(date: Date, lang: 'es' | 'en'): string {
  return date.toLocaleDateString(lang === 'en' ? 'en-US' : 'es-CO', { month: 'long', year: 'numeric' })
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

function PieceModal({ piece, lang, onClose }: { piece: ContentPiece; lang: 'es' | 'en'; onClose: () => void }) {
  const platformColor = PLATFORM_COLORS[piece.platform] ?? 'bg-zinc-500'

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-4">
          <span className={`text-white text-xs font-bold px-2 py-1 rounded-full ${platformColor}`}>{piece.platform}</span>
          <span className="text-xs bg-zinc-100 text-zinc-600 px-2 py-1 rounded-full">{piece.format}</span>
          {piece.funnelStage && (
            <span className="text-xs bg-zinc-100 text-zinc-600 px-2 py-1 rounded-full ml-auto">{piece.funnelStage.toUpperCase()}</span>
          )}
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 ml-1 text-lg leading-none">×</button>
        </div>
        <p className="font-semibold text-zinc-900 mb-2 leading-snug">{piece.hook}</p>
        <p className="text-sm text-zinc-600 leading-relaxed mb-3">{piece.body}</p>
        {piece.cta && <p className="text-xs text-zinc-500 italic border-l-2 border-zinc-200 pl-2 mb-2">{piece.cta}</p>}
        {piece.hashtags && <p className="text-xs text-zinc-400">{piece.hashtags}</p>}
      </div>
    </div>
  )
}

export default function TabCalendario({ sessionId, lang }: { sessionId: string; lang: 'es' | 'en' }) {
  const s = strings[lang]
  const today = new Date()
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [pieces, setPieces] = useState<ContentPiece[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'monthly' | 'weekly'>('monthly')
  const [selectedWeek, setSelectedWeek] = useState(1)
  const [selectedPiece, setSelectedPiece] = useState<ContentPiece | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/sessions/${sessionId}/content`)
      .then(r => r.ok ? r.json() : [])
      .then((data: ContentPiece[]) => { setPieces(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [sessionId])

  function prevMonth() {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) }
    else setCurrentMonth(m => m - 1)
  }
  function nextMonth() {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) }
    else setCurrentMonth(m => m + 1)
  }

  // Build date-keyed map: "YYYY-MM-DD" → pieces[]
  const piecesByDate: Record<string, ContentPiece[]> = {}
  const piecesByWeek: Record<number, ContentPiece[]> = { 1: [], 2: [], 3: [], 4: [] }

  for (const p of pieces) {
    const dateStr = p.scheduledAt ?? p.releasedAt
    if (dateStr) {
      const d = new Date(dateStr)
      if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
        const key = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        if (!piecesByDate[key]) piecesByDate[key] = []
        piecesByDate[key].push(p)
      }
    }
    // Also bucket by week field
    if (p.week >= 1 && p.week <= 4) {
      piecesByWeek[p.week].push(p)
    }
  }

  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth)
  // Pad to start on Sunday
  const calDays: Array<number | null> = Array(firstDay).fill(null)
  for (let d = 1; d <= daysInMonth; d++) calDays.push(d)
  // Pad to fill last row
  while (calDays.length % 7 !== 0) calDays.push(null)

  const DAY_HEADERS = lang === 'en'
    ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    : ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
    </div>
  )

  return (
    <div>
      {selectedPiece && <PieceModal piece={selectedPiece} lang={lang} onClose={() => setSelectedPiece(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-zinc-100 text-sm transition">{s.prev}</button>
          <h2 className="font-bold text-zinc-900 text-lg capitalize min-w-[160px] text-center">
            {formatDate(new Date(currentYear, currentMonth), lang)}
          </h2>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-zinc-100 text-sm transition">{s.next}</button>
        </div>
        <div className="flex gap-1 bg-zinc-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('monthly')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${viewMode === 'monthly' ? 'bg-white shadow text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}
          >
            {s.monthly}
          </button>
          <button
            onClick={() => setViewMode('weekly')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${viewMode === 'weekly' ? 'bg-white shadow text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}
          >
            {s.weekly}
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-3 mb-4 text-xs">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />{s.tofu}</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />{s.mofu}</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />{s.bofu}</span>
      </div>

      {viewMode === 'monthly' ? (
        <>
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_HEADERS.map(h => (
              <div key={h} className="text-center text-xs font-semibold text-zinc-400 py-2">{h}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-px bg-zinc-200 rounded-xl overflow-hidden border border-zinc-200">
            {calDays.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} className="bg-zinc-50 min-h-[80px]" />

              const key = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const dayPieces = piecesByDate[key] ?? []
              const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()

              return (
                <div key={key} className={`bg-white min-h-[80px] p-1.5 ${isToday ? 'ring-2 ring-inset ring-zinc-900' : ''}`}>
                  <div className={`text-xs font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-zinc-900 text-white' : 'text-zinc-500'}`}>
                    {day}
                  </div>
                  <div className="space-y-0.5">
                    {dayPieces.slice(0, 3).map(p => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedPiece(p)}
                        className={`w-full text-left text-[10px] leading-tight p-1 rounded border-l-2 ${FUNNEL_COLORS[p.funnelStage] ?? 'border-l-zinc-300'} bg-zinc-50 hover:bg-zinc-100 transition truncate`}
                      >
                        <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${PLATFORM_COLORS[p.platform] ?? 'bg-zinc-400'}`} />
                        {p.hook.slice(0, 30)}
                      </button>
                    ))}
                    {dayPieces.length > 3 && (
                      <p className="text-[10px] text-zinc-400 pl-1">+{dayPieces.length - 3} más</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      ) : (
        /* Weekly view — by week number */
        <div>
          <div className="flex gap-1 mb-4">
            {[1, 2, 3, 4].map(w => (
              <button
                key={w}
                onClick={() => setSelectedWeek(w)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${selectedWeek === w ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}
              >
                {s.week(w)} ({piecesByWeek[w]?.length ?? 0})
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(piecesByWeek[selectedWeek] ?? []).map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedPiece(p)}
                className={`text-left bg-white rounded-xl border border-zinc-100 p-4 border-l-4 ${FUNNEL_COLORS[p.funnelStage] ?? 'border-l-zinc-200'} hover:shadow-sm transition`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-white text-xs px-2 py-0.5 rounded-full ${PLATFORM_COLORS[p.platform] ?? 'bg-zinc-500'}`}>{p.platform}</span>
                  <span className="text-xs text-zinc-400">{p.format}</span>
                </div>
                <p className="text-sm font-medium text-zinc-900 line-clamp-2">{p.hook}</p>
              </button>
            ))}
            {(piecesByWeek[selectedWeek] ?? []).length === 0 && (
              <p className="text-sm text-zinc-400 col-span-2 py-8 text-center">{s.noPieces}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
